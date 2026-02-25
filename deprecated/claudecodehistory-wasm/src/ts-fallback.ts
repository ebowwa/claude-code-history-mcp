/**
 * TypeScript fallback implementations for WASM functions
 * Used when WASM fails to load or is not available
 */

import type {
  ClaudeCodeMessage,
  ConversationEntry,
  BatchParseResult,
  ParseError,
  ParseOptions,
  SearchOptions,
  SearchResult,
  SearchMatch,
} from '../types/index.js';

/**
 * Parse JSONL content string into conversation entries (TypeScript implementation)
 */
export function parseJsonlContentTS(
  content: string,
  options: ParseOptions = {}
): ConversationEntry[] {
  const lines = content.split('\n').filter((line) => line.trim());
  const entries: ConversationEntry[] = [];

  const {
    sessionId,
    startDate,
    endDate,
    messageTypes,
    timezone = 'UTC',
    limit,
    offset = 0,
  } = options;

  for (const line of lines) {
    try {
      const message: ClaudeCodeMessage = JSON.parse(line);

      // Apply filters
      if (sessionId && message.sessionId !== sessionId) continue;
      if (startDate && message.timestamp < startDate) continue;
      if (endDate && message.timestamp > endDate) continue;
      if (messageTypes && messageTypes.length > 0 && !messageTypes.includes(message.type))
        continue;

      const entry = convertMessageToEntry(message, timezone);
      if (entry) {
        entries.push(entry);
      }
    } catch {
      // Skip invalid lines
      continue;
    }
  }

  // Sort by timestamp (newest first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply pagination
  const paginatedEntries = limit !== undefined ? entries.slice(offset, offset + limit) : entries.slice(offset);

  return paginatedEntries;
}

/**
 * Parse JSONL content with detailed results including errors
 */
export function parseJsonlContentDetailedTS(
  content: string,
  options: ParseOptions = {}
): BatchParseResult {
  const startTime = Date.now();
  const lines = content.split('\n');
  const entries: ConversationEntry[] = [];
  const errors: ParseError[] = [];
  let parsedLines = 0;
  let skippedLines = 0;

  const { sessionId, startDate, endDate, messageTypes, timezone = 'UTC' } = options;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) {
      skippedLines++;
      continue;
    }

    try {
      const message: ClaudeCodeMessage = JSON.parse(line);

      // Apply filters
      if (sessionId && message.sessionId !== sessionId) {
        skippedLines++;
        continue;
      }
      if (startDate && message.timestamp < startDate) {
        skippedLines++;
        continue;
      }
      if (endDate && message.timestamp > endDate) {
        skippedLines++;
        continue;
      }
      if (messageTypes && messageTypes.length > 0 && !messageTypes.includes(message.type)) {
        skippedLines++;
        continue;
      }

      const entry = convertMessageToEntry(message, timezone);
      if (entry) {
        entries.push(entry);
        parsedLines++;
      } else {
        skippedLines++;
      }
    } catch (error) {
      errors.push({
        lineNumber: i + 1,
        line: line.slice(0, 200),
        error: error instanceof Error ? error.message : 'Unknown parse error',
      });
      skippedLines++;
    }
  }

  return {
    entries,
    totalLines: lines.filter((l) => l.trim()).length,
    parsedLines,
    skippedLines,
    errors,
    parseTimeMs: Date.now() - startTime,
  };
}

/**
 * Search entries by query string (TypeScript implementation)
 */
export function searchEntriesTS(
  entries: ConversationEntry[],
  options: SearchOptions
): SearchResult[] {
  const {
    query,
    caseSensitive = false,
    fields = ['content'],
    projectPath,
    sessionId,
    startDate,
    endDate,
    limit = 100,
  } = options;

  const searchQuery = caseSensitive ? query : query.toLowerCase();
  const results: SearchResult[] = [];

  for (const entry of entries) {
    // Apply filters
    if (projectPath && entry.projectPath !== projectPath) continue;
    if (sessionId && entry.sessionId !== sessionId) continue;
    if (startDate && entry.timestamp < startDate) continue;
    if (endDate && entry.timestamp > endDate) continue;

    const matches: SearchMatch[] = [];
    let score = 0;

    // Search in specified fields
    for (const field of fields) {
      const fieldValue = entry[field] as string | undefined;
      if (typeof fieldValue !== 'string') continue;

      const searchValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
      const searchIndex = searchValue.indexOf(searchQuery);

      if (searchIndex !== -1) {
        // Calculate context (50 chars before and after match)
        const contextStart = Math.max(0, searchIndex - 50);
        const contextEnd = Math.min(fieldValue.length, searchIndex + query.length + 50);

        matches.push({
          field,
          startIndex: searchIndex,
          endIndex: searchIndex + query.length,
          matchedText: fieldValue.slice(searchIndex, searchIndex + query.length),
          context: fieldValue.slice(contextStart, contextEnd),
        });

        // Score based on field priority and match position
        if (field === 'content') score += 10;
        if (field === 'projectPath') score += 5;
        if (field === 'sessionId') score += 3;

        // Bonus for matches at the start
        if (searchIndex === 0) score += 5;
      }
    }

    if (matches.length > 0) {
      results.push({
        entry,
        matches,
        score: score + matches.length,
      });
    }

    if (results.length >= limit) break;
  }

  // Sort by score (highest first)
  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * Convert a ClaudeCodeMessage to a ConversationEntry
 */
function convertMessageToEntry(message: ClaudeCodeMessage, timezone: string): ConversationEntry | null {
  try {
    let content = '';

    if (message.message?.content) {
      if (typeof message.message.content === 'string') {
        content = message.message.content;
      } else if (Array.isArray(message.message.content)) {
        content = message.message.content
          .map((item) => {
            if (typeof item === 'string') return item;
            if (item?.type === 'text' && item?.text) return item.text;
            return '';
          })
          .filter(Boolean)
          .join(' ');
      }
    }

    const projectPath = decodeProjectPath(message.cwd);
    const messageDate = new Date(message.timestamp);

    return {
      sessionId: message.sessionId,
      timestamp: message.timestamp,
      type: message.type,
      content,
      projectPath,
      uuid: message.uuid,
      formattedTime: formatDate(messageDate, timezone),
      timeAgo: getTimeAgo(messageDate),
      localDate: formatDateOnly(messageDate, timezone),
      metadata: {
        usage: message.message?.usage,
        model: message.message?.model,
        requestId: message.requestId,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Decode project path from Claude Code format
 */
function decodeProjectPath(cwd: string): string {
  // Claude Code uses cwd directly, just return it
  return cwd;
}

/**
 * Format date to human-readable string
 */
function formatDate(date: Date, timezone: string): string {
  try {
    return date.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return date.toISOString();
  }
}

/**
 * Format date to YYYY-MM-DD string
 */
function formatDateOnly(date: Date, timezone: string): string {
  try {
    return date.toLocaleDateString('sv-SE', { timeZone: timezone });
  } catch {
    return date.toISOString().split('T')[0] || '';
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

/**
 * Validate a JSONL line
 */
export function validateJsonlLineTS(line: string): { valid: boolean; error?: string } {
  if (!line.trim()) {
    return { valid: false, error: 'Empty line' };
  }

  try {
    const parsed = JSON.parse(line);

    // Check required fields
    const requiredFields = ['sessionId', 'timestamp', 'type', 'uuid'];
    const missingFields = requiredFields.filter((field) => !(field in parsed));

    if (missingFields.length > 0) {
      return { valid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
    }

    // Validate type
    const validTypes = ['user', 'assistant', 'system', 'result'];
    if (!validTypes.includes(parsed.type)) {
      return { valid: false, error: `Invalid type: ${parsed.type}` };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }
}

/**
 * Extract message content from various formats
 */
export function extractContentTS(message: ClaudeCodeMessage): string {
  if (!message.message?.content) {
    return '';
  }

  const content = message.message.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item?.type === 'text' && item?.text) return item.text;
        return '';
      })
      .filter(Boolean)
      .join(' ');
  }

  return '';
}
