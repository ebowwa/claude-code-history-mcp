/**
 * Types for @ebowwa/claudecodehistory-wasm
 * Copied and adapted from @ebowwa/claudecodehistory
 */

/**
 * Raw message format from Claude Code JSONL files
 */
export interface ClaudeCodeMessage {
  parentUuid: string | null;
  isSidechain: boolean;
  userType: string;
  cwd: string;
  sessionId: string;
  version: string;
  type: 'user' | 'assistant' | 'system' | 'result';
  message?: {
    role: string;
    content: string | MessageContent[];
    model?: string;
    usage?: UsageInfo;
  };
  uuid: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Content item in message content array
 */
export interface MessageContent {
  type: 'text' | 'image' | 'tool_use' | 'tool_result';
  text?: string;
  source?: {
    type: string;
    media_type?: string;
    data?: string;
  };
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | MessageContent[];
}

/**
 * Usage information from API responses
 */
export interface UsageInfo {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * Processed conversation entry for easy consumption
 */
export interface ConversationEntry {
  sessionId: string;
  timestamp: string;
  type: 'user' | 'assistant' | 'system' | 'result';
  content: string;
  projectPath: string;
  uuid: string;
  /** Human readable time in local timezone */
  formattedTime?: string;
  /** Relative time (e.g., "2 hours ago") */
  timeAgo?: string;
  /** Date in YYYY-MM-DD format in local timezone */
  localDate?: string;
  metadata?: EntryMetadata;
}

/**
 * Metadata attached to conversation entries
 */
export interface EntryMetadata {
  usage?: UsageInfo;
  totalCostUsd?: number;
  numTurns?: number;
  durationMs?: number;
  isError?: boolean;
  errorType?: string;
  model?: string;
  requestId?: string;
}

/**
 * Result of batch parsing operations
 */
export interface BatchParseResult {
  entries: ConversationEntry[];
  totalLines: number;
  parsedLines: number;
  skippedLines: number;
  errors: ParseError[];
  parseTimeMs: number;
}

/**
 * Error information for failed line parses
 */
export interface ParseError {
  lineNumber: number;
  line: string;
  error: string;
}

/**
 * Options for parsing JSONL content
 */
export interface ParseOptions {
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by start date (ISO string) */
  startDate?: string;
  /** Filter by end date (ISO string) */
  endDate?: string;
  /** Filter by message types */
  messageTypes?: ('user' | 'assistant' | 'system' | 'result')[];
  /** Timezone for date formatting (e.g., 'Asia/Tokyo', 'UTC') */
  timezone?: string;
  /** Maximum number of entries to return */
  limit?: number;
  /** Number of entries to skip */
  offset?: number;
}

/**
 * Options for searching entries
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Case sensitive search */
  caseSensitive?: boolean;
  /** Search in specific fields only */
  fields?: ('content' | 'projectPath' | 'sessionId')[];
  /** Filter by project path */
  projectPath?: string;
  /** Filter by session ID */
  sessionId?: string;
  /** Filter by start date */
  startDate?: string;
  /** Filter by end date */
  endDate?: string;
  /** Maximum results to return */
  limit?: number;
  /** Include tool calls in search */
  includeTools?: boolean;
}

/**
 * Search result with match information
 */
export interface SearchResult {
  entry: ConversationEntry;
  matches: SearchMatch[];
  score: number;
}

/**
 * Information about a search match
 */
export interface SearchMatch {
  field: string;
  startIndex: number;
  endIndex: number;
  matchedText: string;
  context?: string;
}

/**
 * WASM module initialization options
 */
export interface WasmInitOptions {
  /** Custom path to WASM file */
  wasmPath?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Fallback to TypeScript implementation if WASM fails */
  enableFallback?: boolean;
}

/**
 * WASM module status
 */
export interface WasmStatus {
  initialized: boolean;
  usingWasm: boolean;
  usingFallback: boolean;
  version: string;
  loadTimeMs?: number;
  error?: string;
}
