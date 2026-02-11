# @ebowwa/claudecodehistory

A TypeScript library for accessing and analyzing Claude Code conversation history with smart filtering and pagination.

## Features

This library provides a `ClaudeCodeHistoryService` class that offers:

- **Conversation History Access** - Read Claude Code's `.jsonl` history files from `~/.claude/projects/`
- **Smart Filtering** - Filter by date range, project, session, and message types
- **Pagination Support** - Efficiently handle large datasets with limit/offset
- **Timezone Intelligence** - Automatic timezone detection with manual override support
- **Content Search** - Search conversation content across all projects
- **TypeScript Types** - Full TypeScript support with exported types

## Installation

```bash
bun install @ebowwa/claudecodehistory
```

## Quick Start

```typescript
import { ClaudeCodeHistoryService } from '@ebowwa/claudecodehistory';

const service = new ClaudeCodeHistoryService();

// List all projects
const projects = await service.listProjects();
console.log(projects);
// [
//   {
//     projectPath: '/Users/username/code/my-project',
//     sessionCount: 15,
//     messageCount: 342,
//     lastActivityTime: '2025-01-15T10:30:00.000Z'
//   }
// ]

// Get conversation history with pagination
const history = await service.getConversationHistory({
  limit: 20,
  offset: 0,
  messageTypes: ['user'], // Only user messages (default)
  timezone: 'Asia/Tokyo'
});
console.log(history.entries);
console.log(history.pagination);
// {
//   total_count: 150,
//   limit: 20,
//   offset: 0,
//   has_more: true
// }

// Search conversations
const results = await service.searchConversations('API integration', {
  limit: 30,
  projectPath: '/Users/username/code/my-project',
  startDate: '2025-01-01',
  endDate: '2025-01-31'
});
```

## API

### `ClaudeCodeHistoryService`

Main service class for accessing Claude Code history.

#### Constructor

```typescript
const service = new ClaudeCodeHistoryService();
```

Automatically uses `~/.claude` as the data directory.

#### Methods

##### `getConversationHistory(options)`

Get paginated conversation history.

```typescript
const result = await service.getConversationHistory({
  sessionId?: string,        // Filter by specific session
  startDate?: string,        // Start date (e.g., "2025-01-01")
  endDate?: string,          // End date (e.g., "2025-01-31")
  limit?: number,            // Max entries (default: 20)
  offset?: number,           // Skip entries (default: 0)
  messageTypes?: Array<'user' | 'assistant' | 'system' | 'result'>,
  timezone?: string          // Timezone (e.g., "Asia/Tokyo", "UTC")
});
```

Returns: `PaginatedConversationResponse`

##### `searchConversations(query, options)`

Search conversation content.

```typescript
const results = await service.searchConversations('search query', {
  limit?: number,
  projectPath?: string,
  startDate?: string,
  endDate?: string,
  timezone?: string
});
```

Returns: `ConversationEntry[]`

##### `listProjects()`

List all projects with conversation history.

```typescript
const projects = await service.listProjects();
```

Returns: `ProjectInfo[]`

##### `listSessions(options)`

List conversation sessions.

```typescript
const sessions = await service.listSessions({
  projectPath?: string,
  startDate?: string,
  endDate?: string,
  timezone?: string
});
```

Returns: `SessionInfo[]`

##### `getCurrentSession()`

Get information about the currently active Claude Code session.

```typescript
const currentSession = await service.getCurrentSession();
```

Returns: `CurrentSessionInfo | null`

**Notes:**
- Returns `null` if no active session is found
- Uses a best-effort approach to detect the current session by checking running processes and recently modified session files
- The detected session may not always be the actual active session if multiple Claude Code instances are running

##### `getSessionByPid(pid)`

Get session information by process ID.

```typescript
const sessionInfo = await service.getSessionByPid(12345);
```

**Parameters:**
- `pid` (number) - Process ID of the Claude Code session

Returns: `SessionProcessInfo | null`

**Notes:**
- Returns `null` if no session is found for the given PID
- Cross-references running processes with session history files
- Useful for correlating active Claude Code processes with their conversation history

##### `listAllSessionUuids()`

List all session UUIDs across all projects.

```typescript
const uuids = await service.listAllSessionUuids();
// Returns: ["uuid-1", "uuid-2", "uuid-3", ...]
```

Returns: `string[]`

**Notes:**
- Returns a flat array of all session UUIDs
- Useful for bulk operations or generating session inventories
- Does not include project path information - use `listSessions()` for detailed session metadata

## Types

```typescript
interface ConversationEntry {
  sessionId: string;
  timestamp: string;
  type: 'user' | 'assistant' | 'system' | 'result';
  content: string;
  projectPath: string;
  uuid: string;
  formattedTime?: string;
  timeAgo?: string;
  localDate?: string;
  metadata?: {
    usage?: any;
    totalCostUsd?: number;
    numTurns?: number;
    durationMs?: number;
    isError?: boolean;
    errorType?: string;
    model?: string;
    requestId?: string;
  };
}

interface PaginatedConversationResponse {
  entries: ConversationEntry[];
  pagination: {
    total_count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

interface ProjectInfo {
  projectPath: string;
  sessionCount: number;
  messageCount: number;
  lastActivityTime: string;
}

interface SessionInfo {
  sessionId: string;
  projectPath: string;
  startTime: string;
  endTime: string;
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
}

interface CurrentSessionInfo {
  uuid: string;
  projectPath: string;
  pid?: number;
  command?: string;
}

interface SessionProcessInfo {
  uuid: string;
  projectPath: string;
  pid: number;
  command: string;
  startTime?: string;
  messageCount?: number;
}
```

## Smart Features

### Message Type Filtering

Default behavior only returns user messages to reduce data volume:

```typescript
// Only user messages (default)
await service.getConversationHistory();

// User and assistant messages
await service.getConversationHistory({
  messageTypes: ['user', 'assistant']
});

// All message types
await service.getConversationHistory({
  messageTypes: ['user', 'assistant', 'system', 'result']
});
```

### Timezone Support

Automatic timezone detection with manual override:

```typescript
// Auto-detect system timezone
await service.getConversationHistory();

// Explicit timezone
await service.getConversationHistory({
  timezone: 'Asia/Tokyo'
});
```

### Date Filtering

Smart date normalization with timezone awareness:

```typescript
await service.getConversationHistory({
  startDate: '2025-01-01',  // Automatically normalized to proper timezone bounds
  endDate: '2025-01-31',
  timezone: 'America/New_York'
});
```

## Example MCP Server

This repository includes an example MCP server in the `example/` directory that demonstrates how to use this library to build an MCP server.

See [example/README.md](./example/README.md) for details.

## Development

```bash
# Clone repository
git clone https://github.com/ebowwa/claude-code-history-mcp.git
cd claude-code-history-mcp

# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test
```

## License

MIT
