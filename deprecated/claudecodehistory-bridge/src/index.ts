/**
 * @ebowwa/claudecodehistory-bridge
 *
 * Claude Code history parser using stdin/stdout bridge with MessagePack binary protocol.
 * Uses length-prefixed frames for efficient binary communication.
 */

// Re-export types
export type {
  ConversationEntry,
  ParseResult,
  SearchResult,
  WorkerInfo,
} from "./types.js";

// Re-export client
export {
  ClaudeCodeHistoryClient,
  createHistoryClient,
  type HistoryWorkerOptions,
} from "./msgpack-client.js";

// Default export
export { createHistoryClient as default } from "./msgpack-client.js";
