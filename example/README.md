# Claude Code History MCP Server - Example

This is an example MCP server that demonstrates how to use the `@ebowwa/claudecodehistory` library to create an MCP server for Claude Code conversation history.

## About This Example

This example shows how to:
- Use the `ClaudeCodeHistoryService` class from the library
- Wrap it in an MCP server using the Model Context Protocol SDK
- Expose the service's functionality as MCP tools

## Features

This MCP server provides **4 powerful tools** for exploring your Claude Code conversation history:

### 1. `list_projects`
Discover all projects with Claude Code conversation history.

### 2. `list_sessions`
List conversation sessions for exploration and filtering.

### 3. `get_conversation_history`
Retrieve paginated conversation history with smart filtering.

### 4. `search_conversations`
Search across all conversation content by keywords.

## Quick Start

```bash
# From the example directory
cd example

# Install dependencies (uses bun)
bun install

# Run directly
bun src/index.ts
```

## Usage with MCP Clients

Add the following configuration to your MCP client (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "claude-code-history": {
      "command": "bun",
      "args": ["/path/to/claude-code-history-mcp/example/src/index.ts"]
    }
  }
}
```

## Development

- **Runtime:** `bun` (no build step required)
- **TypeScript:** Executed directly via bun
- **Hot reload:** `bun --hot src/index.ts`

## Library Dependency

This example imports from `@ebowwa/claudecodehistory` (the parent package):

```typescript
import { ClaudeCodeHistoryService } from '@ebowwa/claudecodehistory';
```

The service provides all the core functionality for accessing Claude Code history:

- `getConversationHistory()` - Get paginated conversation history
- `searchConversations()` - Search by content
- `listProjects()` - List all projects
- `listSessions()` - List sessions with filters

## License

MIT
