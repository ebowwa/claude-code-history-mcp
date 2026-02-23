/**
 * @ebowwa/claudecodehistory-bridge
 *
 * Claude Code history parser using stdin/stdout bridge with MessagePack binary protocol.
 * Uses length-prefixed frames for efficient binary communication.
 */

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { encode, decode } from "@msgpack/msgpack";

// Re-export types
export type {
  ConversationEntry,
  ParseResult,
  SearchResult,
  WorkerInfo,
} from "./types.js";

// Get default binary path
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_BINARY_PATH = resolve(
  __dirname,
  "..",
  "rust-worker",
  "target",
  "release",
  "claudecodehistory-worker"
);

// ============================================================================
// Protocol Types
// ============================================================================

interface Request {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: unknown;
}

interface SuccessResponse<T = unknown> {
  jsonrpc: "2.0";
  id: string;
  result: T;
}

interface ErrorObject {
  code: number;
  message: string;
}

interface ErrorResponse {
  jsonrpc: "2.0";
  id: string;
  error: ErrorObject;
}

type Response<T = unknown> = SuccessResponse<T> | ErrorResponse;

function isErrorResponse<T>(response: Response<T>): response is ErrorResponse {
  return "error" in response;
}

// ============================================================================
// Frame Protocol (4-byte length prefix + MessagePack payload)
// ============================================================================

function writeFrame(data: Uint8Array): Buffer {
  const len = data.length;
  const buf = Buffer.alloc(4 + len);
  buf.writeUInt32BE(len, 0);
  buf.set(data, 4);
  return buf;
}

function readFrameSize(buf: Buffer, offset: number): number {
  return buf.readUInt32BE(offset);
}

// ============================================================================
// Pending Request Tracking
// ============================================================================

interface PendingRequest {
  resolve: (response: Response) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  startTime: number;
}

// ============================================================================
// Client Options
// ============================================================================

export interface HistoryWorkerOptions {
  binaryPath?: string;
  debug?: boolean;
  requestTimeout?: number;
}

// ============================================================================
// MessagePack Bridge Client
// ============================================================================

export class ClaudeCodeHistoryClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private binaryPath: string;
  private debug: boolean;
  private requestTimeout: number;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private requestCounter = 0;
  private readBuffer = Buffer.alloc(0);
  private expectedFrameSize: number | null = null;
  private startTime = 0;
  private requestCount = 0;
  private errorCount = 0;
  private shuttingDown = false;

  constructor(options: HistoryWorkerOptions = {}) {
    super();
    this.binaryPath = options.binaryPath || DEFAULT_BINARY_PATH;
    this.debug = options.debug || false;
    this.requestTimeout = options.requestTimeout || 30000;
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Start the Rust worker process
   */
  async start(): Promise<void> {
    if (this.process) {
      throw new Error("Worker already running");
    }

    return new Promise((resolve, reject) => {
      this.log(`Spawning worker: ${this.binaryPath}`);

      this.process = spawn(this.binaryPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.startTime = Date.now();

      // Handle spawn errors
      this.process.on("error", (error) => {
        this.errorCount++;
        this.emit("error", error);
        if (!this.process?.pid) {
          reject(error);
        }
      });

      // Handle stdout (MessagePack responses)
      this.process.stdout?.on("data", (data: Buffer) => {
        this.handleStdout(data);
      });

      // Handle stderr (logs)
      this.process.stderr?.on("data", (data: Buffer) => {
        const message = data.toString().trim();
        this.emit("stderr", message);
        if (this.debug) {
          console.error("[rust-worker]", message);
        }
      });

      // Handle exit
      this.process.on("exit", (code, signal) => {
        this.emit("exit", { code, signal });
        this.handleWorkerExit();
      });

      // Wait for process to be ready
      setImmediate(() => {
        if (this.process?.pid) {
          this.emit("spawned", { pid: this.process.pid });
          resolve();
        }
      });
    });
  }

  /**
   * Gracefully shutdown the worker
   */
  async shutdown(): Promise<void> {
    if (!this.process || this.shuttingDown) {
      return;
    }

    this.shuttingDown = true;
    this.log("Shutting down worker...");

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Worker shutting down"));
      this.pendingRequests.delete(id);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.log("Force killing worker");
        this.process?.kill("SIGKILL");
      }, 5000);

      this.process?.on("exit", () => {
        clearTimeout(timeout);
        this.process = null;
        this.shuttingDown = false;
        this.log("Worker shutdown complete");
        resolve();
      });

      // Close stdin to signal graceful shutdown
      this.process?.stdin?.end();
    });
  }

  // -------------------------------------------------------------------------
  // Request Methods
  // -------------------------------------------------------------------------

  /**
   * Send a raw request with any method/params
   */
  async requestRaw<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.process?.stdin?.writable) {
      throw new Error("Worker not running");
    }

    const id = this.generateId();
    const request: Request = {
      jsonrpc: "2.0",
      id,
      method,
    };
    if (params !== undefined) {
      request.params = params;
    }

    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        this.errorCount++;
        reject(new Error(`Request timeout: ${method}`));
      }, this.requestTimeout);

      // Track pending request
      this.pendingRequests.set(id, {
        resolve: (response) => {
          this.requestCount++;
          if (!isErrorResponse(response)) {
            resolve(response.result as T);
          } else {
            this.errorCount++;
            const error = new Error(
              `${response.error.message} (code: ${response.error.code})`
            );
            (error as any).code = response.error.code;
            reject(error);
          }
        },
        reject,
        timeout,
        startTime: Date.now(),
      });

      // Encode to MessagePack and send
      try {
        const encoded = encode(request);
        const frame = writeFrame(encoded);
        this.log(`> frame ${frame.length} bytes`);
        this.process?.stdin?.write(frame);
      } catch (e) {
        this.pendingRequests.delete(id);
        reject(e);
      }
    });
  }

  // -------------------------------------------------------------------------
  // API Methods
  // -------------------------------------------------------------------------

  /**
   * Get worker info
   */
  async info(): Promise<import("./types.js").WorkerInfo> {
    return this.requestRaw("worker.info");
  }

  /**
   * Parse JSONL content string
   */
  async parseContent(content: string): Promise<import("./types.js").ParseResult> {
    return this.requestRaw("parser.parseContent", { content });
  }

  /**
   * Search entries
   */
  async search(
    entries: import("./types.js").ConversationEntry[],
    query: string,
    limit = 100
  ): Promise<import("./types.js").SearchResult> {
    return this.requestRaw("parser.search", { entries, query, limit });
  }

  /**
   * Quick search that returns only matching entries
   */
  async quickSearch(
    entries: import("./types.js").ConversationEntry[],
    query: string
  ): Promise<import("./types.js").ConversationEntry[]> {
    const result = await this.search(entries, query, 1000);
    return result.entries;
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  /**
   * Get worker status
   */
  getStatus() {
    return {
      running: this.process !== null && !this.shuttingDown,
      pid: this.process?.pid,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      requestCount: this.requestCount,
      errorCount: this.errorCount,
    };
  }

  // -------------------------------------------------------------------------
  // Private Methods
  // -------------------------------------------------------------------------

  private generateId(): string {
    return `${Date.now()}-${++this.requestCounter}`;
  }

  private log(message: string): void {
    if (this.debug) {
      console.log("[bridge]", message);
    }
  }

  private handleStdout(data: Buffer): void {
    // Append to buffer
    this.readBuffer = Buffer.concat([this.readBuffer, data]);

    // Process frames
    while (true) {
      // Do we have enough bytes for the frame size header?
      if (this.expectedFrameSize === null) {
        if (this.readBuffer.length < 4) {
          break; // Need more data
        }
        this.expectedFrameSize = readFrameSize(this.readBuffer, 0);
        this.readBuffer = this.readBuffer.subarray(4);
      }

      // Do we have the complete frame?
      if (this.readBuffer.length < this.expectedFrameSize) {
        break; // Need more data
      }

      // Extract and decode the frame
      const frameData = this.readBuffer.subarray(0, this.expectedFrameSize);
      this.readBuffer = this.readBuffer.subarray(this.expectedFrameSize);
      this.expectedFrameSize = null;

      this.log(`< frame ${frameData.length} bytes`);

      try {
        const response = decode(frameData) as Response;
        this.log(`Decoded response: ${JSON.stringify(response)}`);
        this.handleResponse(response);
      } catch (e) {
        this.log(`Failed to decode frame: ${e}`);
      }
    }
  }

  private handleResponse(response: Response): void {
    const pending = this.pendingRequests.get(response.id);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.id);
      pending.resolve(response);
    } else {
      this.log(`No pending request for id: ${response.id}`);
    }
  }

  private handleWorkerExit(): void {
    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Worker process exited"));
    }
    this.pendingRequests.clear();
    this.process = null;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create and start a history client
 */
async function createHistoryClient(
  options?: HistoryWorkerOptions
): Promise<ClaudeCodeHistoryClient> {
  const client = new ClaudeCodeHistoryClient(options);
  await client.start();
  return client;
}

// Default export
export default { createHistoryClient, ClaudeCodeHistoryClient };

// Named exports
export { createHistoryClient };
