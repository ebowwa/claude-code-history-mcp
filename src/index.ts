/**
 * @ebowwa/claudecodehistory
 *
 * High-performance Claude Code conversation history parser.
 * TypeScript implementation with optional Rust native bindings.
 *
 * Usage:
 * ```typescript
 * import { ClaudeCodeHistoryService } from '@ebowwa/claudecodehistory';
 *
 * const service = new ClaudeCodeHistoryService();
 * const history = await service.getConversationHistory({ limit: 10 });
 * ```
 */

// Re-export all types
export type {
  ClaudeCodeMessage,
  ConversationEntry,
  PaginatedConversationResponse,
  HistoryQueryOptions,
  SessionListOptions,
  ProjectInfo,
  SessionInfo,
  SearchOptions,
  CurrentSessionInfo,
  SessionProcessInfo,
  RecentActivityOptions,
  RecentActivityItem,
} from './history-service.js';

// Main export - TypeScript implementation
export { ClaudeCodeHistoryService } from './history-service.js';

// Re-export parseDir from jsonl-hft for convenience
export { parseDir, CLAUDE_CODE_FIELDS, type GenericEntry } from '@ebowwa/jsonl-hft';

/**
 * Get the implementation type currently in use
 */
export function getImplementation(): 'rust' | 'typescript' {
  // Check if Rust native module is available
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require.resolve('@ebowwa/claudecodehistory-rs');
    return 'rust';
  } catch {
    return 'typescript';
  }
}

/**
 * Create a new ClaudeCodeHistoryService instance
 * Uses Rust implementation if available, otherwise TypeScript
 */
export async function createHistoryService(claudeDir?: string): Promise<import('./history-service.js').ClaudeCodeHistoryService> {
  // For now, always use TypeScript implementation
  // Rust can be used via @ebowwa/claudecodehistory-rs directly
  const { ClaudeCodeHistoryService } = await import('./history-service.js');
  return new ClaudeCodeHistoryService(claudeDir);
}
