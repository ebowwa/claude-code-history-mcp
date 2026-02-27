#!/usr/bin/env bun
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
var stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
var types_js_1 = require("@modelcontextprotocol/sdk/types.js");
var claudecodehistory_1 = require("@ebowwa/claudecodehistory");
var server = new index_js_1.Server({
    name: 'claude-code-history-mcp',
    version: '1.1.0',
}, {
    capabilities: {
        tools: {},
    },
});
var historyService = new claudecodehistory_1.ClaudeCodeHistoryService();
// Helper function to create response
var createResponse = function (data) { return ({
    content: [{
            type: 'text',
            text: JSON.stringify(data),
        }],
}); };
// Define available tools (ordered by recommended workflow)
var tools = [
    {
        name: 'list_projects',
        description: 'List all projects with Claude Code conversation history (start here to explore available data)',
        inputSchema: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'list_sessions',
        description: 'List conversation sessions for a project or date range (use after list_projects to find specific sessions)',
        inputSchema: {
            type: 'object',
            properties: {
                projectPath: {
                    type: 'string',
                    description: 'Filter by specific project path (optional)',
                },
                startDate: {
                    type: 'string',
                    description: 'Start date in ISO format (optional)',
                },
                endDate: {
                    type: 'string',
                    description: 'End date in ISO format (optional)',
                },
                timezone: {
                    type: 'string',
                    description: 'Timezone for date filtering (e.g., "Asia/Tokyo", "UTC"). Defaults to system timezone.',
                },
            },
        },
    },
    {
        name: 'get_conversation_history',
        description: 'Get paginated conversation history (use after exploring with list_projects/list_sessions for targeted data)',
        inputSchema: {
            type: 'object',
            properties: {
                sessionId: {
                    type: 'string',
                    description: 'Specific session ID to get history for (optional)',
                },
                startDate: {
                    type: 'string',
                    description: 'Start date in ISO format (optional)',
                },
                endDate: {
                    type: 'string',
                    description: 'End date in ISO format (optional)',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of conversations to return (default: 20)',
                    default: 20,
                },
                offset: {
                    type: 'number',
                    description: 'Number of conversations to skip for pagination (default: 0)',
                    default: 0,
                },
                messageTypes: {
                    type: 'array',
                    items: {
                        type: 'string',
                        enum: ['user', 'assistant', 'system', 'result']
                    },
                    description: 'Filter by specific message types. Defaults to ["user"] to reduce data volume. Use ["user", "assistant"] to include Claude responses.',
                    default: ['user']
                },
                timezone: {
                    type: 'string',
                    description: 'Timezone for date filtering (e.g., "Asia/Tokyo", "UTC"). Defaults to system timezone.',
                },
            },
        },
    },
    {
        name: 'search_conversations',
        description: 'Search through conversation history by content (useful for finding specific topics across all conversations)',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Search query to find in conversation content',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of results to return (default: 30)',
                    default: 30,
                },
                projectPath: {
                    type: 'string',
                    description: 'Filter by specific project path (optional)',
                },
                startDate: {
                    type: 'string',
                    description: 'Start date in ISO format (optional)',
                },
                endDate: {
                    type: 'string',
                    description: 'End date in ISO format (optional)',
                },
                timezone: {
                    type: 'string',
                    description: 'Timezone for date filtering (e.g., "Asia/Tokyo", "UTC"). Defaults to system timezone.',
                },
            },
            required: ['query'],
        },
    },
];
// Handle list tools request
server.setRequestHandler(types_js_1.ListToolsRequestSchema, function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, { tools: tools }];
    });
}); });
// Handle tool calls
server.setRequestHandler(types_js_1.CallToolRequestSchema, function (request) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name, args, _b, history_1, query, results, projects, sessions, error_1, errorMessage;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = request.params, name = _a.name, args = _a.arguments;
                _c.label = 1;
            case 1:
                _c.trys.push([1, 12, , 13]);
                _b = name;
                switch (_b) {
                    case 'get_conversation_history': return [3 /*break*/, 2];
                    case 'search_conversations': return [3 /*break*/, 4];
                    case 'list_projects': return [3 /*break*/, 6];
                    case 'list_sessions': return [3 /*break*/, 8];
                }
                return [3 /*break*/, 10];
            case 2: return [4 /*yield*/, historyService.getConversationHistory({
                    sessionId: args === null || args === void 0 ? void 0 : args.sessionId,
                    startDate: args === null || args === void 0 ? void 0 : args.startDate,
                    endDate: args === null || args === void 0 ? void 0 : args.endDate,
                    limit: (args === null || args === void 0 ? void 0 : args.limit) || 20,
                    offset: (args === null || args === void 0 ? void 0 : args.offset) || 0,
                    messageTypes: args === null || args === void 0 ? void 0 : args.messageTypes,
                    timezone: args === null || args === void 0 ? void 0 : args.timezone,
                })];
            case 3:
                history_1 = _c.sent();
                return [2 /*return*/, createResponse(history_1)];
            case 4:
                query = args === null || args === void 0 ? void 0 : args.query;
                if (!query) {
                    throw new Error('Search query is required');
                }
                return [4 /*yield*/, historyService.searchConversations(query, {
                        limit: (args === null || args === void 0 ? void 0 : args.limit) || 30,
                        projectPath: args === null || args === void 0 ? void 0 : args.projectPath,
                        startDate: args === null || args === void 0 ? void 0 : args.startDate,
                        endDate: args === null || args === void 0 ? void 0 : args.endDate,
                        timezone: args === null || args === void 0 ? void 0 : args.timezone,
                    })];
            case 5:
                results = _c.sent();
                return [2 /*return*/, createResponse(results)];
            case 6: return [4 /*yield*/, historyService.listProjects()];
            case 7:
                projects = _c.sent();
                return [2 /*return*/, createResponse(projects)];
            case 8: return [4 /*yield*/, historyService.listSessions({
                    projectPath: args === null || args === void 0 ? void 0 : args.projectPath,
                    startDate: args === null || args === void 0 ? void 0 : args.startDate,
                    endDate: args === null || args === void 0 ? void 0 : args.endDate,
                    timezone: args === null || args === void 0 ? void 0 : args.timezone,
                })];
            case 9:
                sessions = _c.sent();
                return [2 /*return*/, createResponse(sessions)];
            case 10: throw new Error("Unknown tool: ".concat(name));
            case 11: return [3 /*break*/, 13];
            case 12:
                error_1 = _c.sent();
                errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                return [2 /*return*/, {
                        content: [{
                                type: 'text',
                                text: "Error: ".concat(errorMessage),
                            }],
                        isError: true,
                    }];
            case 13: return [2 /*return*/];
        }
    });
}); });
// Start the server
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var transport;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    transport = new stdio_js_1.StdioServerTransport();
                    return [4 /*yield*/, server.connect(transport)];
                case 1:
                    _a.sent();
                    console.error('Claude Code History MCP Server started');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
});
