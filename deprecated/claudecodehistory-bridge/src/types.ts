/**
 * Types for Claude Code History Bridge
 */

/**
 * A single conversation entry from Claude Code history
 */
export interface ConversationEntry {
  sessionId: string;
  timestamp: string;
  role: "user" | "assistant" | "system" | "unknown";
  content: string;
  toolName?: string;
  toolInput?: unknown;
  filePath?: string;
}

/**
 * Result of parsing a JSONL file
 */
export interface ParseResult {
  entries: ConversationEntry[];
  count: number;
  errors: string[];
  parseTimeMs: number;
}

/**
 * Result of searching entries
 */
export interface SearchResult {
  entries: ConversationEntry[];
  total: number;
  query: string;
}

/**
 * Worker information
 */
export interface WorkerInfo {
  version: string;
  os: string;
  arch: string;
}

/**
 * Options for parsing
 */
export interface ParseOptions {
  /** Filter by role */
  role?: string;
  /** Filter by session ID */
  sessionId?: string;
  /** Maximum number of entries */
  limit?: number;
  /** Skip entries with errors */
  skipErrors?: boolean;
}

/**
 * Options for searching
 */
export interface SearchOptions {
  /** Search query */
  query: string;
  /** Maximum results */
  limit?: number;
  /** Search in specific fields */
  fields?: ("content" | "role" | "toolName")[];
  /** Case sensitive search */
  caseSensitive?: boolean;
}
