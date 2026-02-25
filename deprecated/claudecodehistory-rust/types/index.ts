/**
 * @ebowwa/claudecodehistory-rust - Types
 *
 * Type definitions for Claude Code history access.
 * These types are compatible with the original @ebowwa/claudecodehistory package.
 *
 * @packageDocumentation
 */

/**
 * Raw message format from Claude Code's JSONL files
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
    content: string | any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    model?: string;
    usage?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };
  uuid: string;
  timestamp: string;
  requestId?: string;
}

/**
 * Processed conversation entry with enriched metadata
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
  metadata?: {
    usage?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    totalCostUsd?: number;
    numTurns?: number;
    durationMs?: number;
    isError?: boolean;
    errorType?: string;
    model?: string;
    requestId?: string;
  };
}

/**
 * Paginated response for conversation history queries
 */
export interface PaginatedConversationResponse {
  entries: ConversationEntry[];
  pagination: {
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

/**
 * Options for querying conversation history
 */
export interface HistoryQueryOptions {
  /** Filter by specific session ID */
  sessionId?: string;
  /** Start date filter (YYYY-MM-DD or ISO format) */
  startDate?: string;
  /** End date filter (YYYY-MM-DD or ISO format) */
  endDate?: string;
  /** Maximum number of entries to return */
  limit?: number;
  /** Number of entries to skip */
  offset?: number;
  /** Timezone for date parsing (e.g., 'Asia/Tokyo', 'UTC') */
  timezone?: string;
  /** Filter by message types (defaults to ['user']) */
  messageTypes?: ('user' | 'assistant' | 'system' | 'result')[];
}

/**
 * Options for listing sessions
 */
export interface SessionListOptions {
  /** Filter by project path */
  projectPath?: string;
  /** Start date filter */
  startDate?: string;
  /** End date filter */
  endDate?: string;
  /** Timezone for date parsing */
  timezone?: string;
}

/**
 * Information about a project
 */
export interface ProjectInfo {
  projectPath: string;
  sessionCount: number;
  messageCount: number;
  lastActivityTime: string;
}

/**
 * Information about a session
 */
export interface SessionInfo {
  sessionId: string;
  projectPath: string;
  startTime: string;
  endTime: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  /** First user message preview (truncated to ~100 chars) */
  firstUserMessage?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** Human-readable duration (e.g., "5m 30s") */
  durationFormatted?: string;
  /** Session status indicators */
  hasErrors?: boolean;
  /** Project name extracted from path (basename) */
  projectName?: string;
}

/**
 * Options for searching conversations
 */
export interface SearchOptions {
  /** Maximum number of results */
  limit?: number;
  /** Filter by project path */
  projectPath?: string;
  /** Start date filter */
  startDate?: string;
  /** End date filter */
  endDate?: string;
  /** Timezone for date parsing */
  timezone?: string;
}

/**
 * Information about the current session
 */
export interface CurrentSessionInfo {
  sessionId: string;
  timestamp: string;
  projectPath?: string;
  display?: string;
}

/**
 * Information about a session process
 */
export interface SessionProcessInfo {
  sessionId: string;
  pid: number;
  command: string;
  alive: boolean;
}

/**
 * Options for recent activity queries
 */
export interface RecentActivityOptions {
  /** Maximum number of items to return */
  limit?: number;
  /** Whether to include session summaries */
  includeSummaries?: boolean;
}

/**
 * Recent activity item showing what was asked and done
 */
export interface RecentActivityItem {
  sessionId: string;
  projectPath: string;
  projectName: string;
  timestamp: string;
  /** First user message - what was asked */
  asked: string;
  /** Brief summary from assistant messages - what was done */
  done?: string;
  /** Human-readable relative time */
  timeAgo: string;
}

/**
 * Result from batch parsing operation
 */
export interface BatchParseResult {
  entries: ConversationEntry[];
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  errors?: string[];
}

/**
 * Search result with match highlighting
 */
export interface SearchResult {
  entry: ConversationEntry;
  matchContext?: string;
  matchIndex?: number;
}

/**
 * FFI response wrapper for Rust library
 * @internal
 */
export interface FFIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
