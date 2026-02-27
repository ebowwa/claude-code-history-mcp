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
var globals_1 = require("@jest/globals");
var child_process_1 = require("child_process");
var path = require("path");
(0, globals_1.describe)('MCP Server Integration Tests', function () {
    var serverPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
    // Helper function to send requests to the server
    var sendRequest = function (request, timeout) {
        if (timeout === void 0) { timeout = 5000; }
        return new Promise(function (resolve, reject) {
            var _a, _b;
            var server = (0, child_process_1.spawn)('node', [serverPath], {
                stdio: 'pipe'
            });
            var output = '';
            var errorOutput = '';
            (_a = server.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                output += data.toString();
            });
            (_b = server.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                errorOutput += data.toString();
            });
            server.on('close', function (code) {
                try {
                    // Find the JSON response in the output
                    var lines = output.trim().split('\n');
                    var jsonLine = lines.find(function (line) { return line.startsWith('{'); });
                    if (jsonLine) {
                        var response = JSON.parse(jsonLine);
                        resolve(response);
                    }
                    else {
                        reject(new Error("No JSON response found. Output: ".concat(output)));
                    }
                }
                catch (error) {
                    reject(new Error("Failed to parse response: ".concat(error, ". Output: ").concat(output)));
                }
            });
            server.on('error', function (error) {
                reject(error);
            });
            // Send request and close stdin
            if (server.stdin) {
                server.stdin.write(JSON.stringify(request) + '\n');
                server.stdin.end();
            }
            // Set timeout
            setTimeout(function () {
                server.kill();
                reject(new Error('Request timeout'));
            }, timeout);
        });
    };
    (0, globals_1.describe)('Server Startup and Basic Functionality', function () {
        (0, globals_1.it)('should start and respond to tools/list request', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 1,
                            method: 'tools/list',
                            params: {}
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response).toMatchObject({
                            jsonrpc: '2.0',
                            id: 1,
                            result: globals_1.expect.objectContaining({
                                tools: globals_1.expect.arrayContaining([
                                    globals_1.expect.objectContaining({
                                        name: 'get_conversation_history'
                                    }),
                                    globals_1.expect.objectContaining({
                                        name: 'search_conversations'
                                    }),
                                    globals_1.expect.objectContaining({
                                        name: 'list_projects'
                                    }),
                                    globals_1.expect.objectContaining({
                                        name: 'list_sessions'
                                    })
                                ])
                            })
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should handle list_projects tool call', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response, projects;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 2,
                            method: 'tools/call',
                            params: {
                                name: 'list_projects',
                                arguments: {}
                            }
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response).toMatchObject({
                            jsonrpc: '2.0',
                            id: 2,
                            result: globals_1.expect.objectContaining({
                                content: globals_1.expect.arrayContaining([
                                    globals_1.expect.objectContaining({
                                        type: 'text',
                                        text: globals_1.expect.any(String)
                                    })
                                ])
                            })
                        });
                        projects = JSON.parse(response.result.content[0].text);
                        (0, globals_1.expect)(Array.isArray(projects)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should handle get_conversation_history tool call', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response, history;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 3,
                            method: 'tools/call',
                            params: {
                                name: 'get_conversation_history',
                                arguments: {
                                    limit: 5
                                }
                            }
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response).toMatchObject({
                            jsonrpc: '2.0',
                            id: 3,
                            result: globals_1.expect.objectContaining({
                                content: globals_1.expect.arrayContaining([
                                    globals_1.expect.objectContaining({
                                        type: 'text',
                                        text: globals_1.expect.any(String)
                                    })
                                ])
                            })
                        });
                        history = JSON.parse(response.result.content[0].text);
                        (0, globals_1.expect)(history).toHaveProperty('entries');
                        (0, globals_1.expect)(history).toHaveProperty('pagination');
                        (0, globals_1.expect)(Array.isArray(history.entries)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('Tool Validation and Error Handling', function () {
        (0, globals_1.it)('should return error for missing required parameters', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 4,
                            method: 'tools/call',
                            params: {
                                name: 'search_conversations',
                                arguments: {} // Missing required 'query' parameter
                            }
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response).toMatchObject({
                            jsonrpc: '2.0',
                            id: 4,
                            result: globals_1.expect.objectContaining({
                                isError: true,
                                content: globals_1.expect.arrayContaining([
                                    globals_1.expect.objectContaining({
                                        type: 'text',
                                        text: 'Error: Search query is required'
                                    })
                                ])
                            })
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should return error for unknown tool', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 5,
                            method: 'tools/call',
                            params: {
                                name: 'unknown_tool',
                                arguments: {}
                            }
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response).toMatchObject({
                            jsonrpc: '2.0',
                            id: 5,
                            result: globals_1.expect.objectContaining({
                                isError: true,
                                content: globals_1.expect.arrayContaining([
                                    globals_1.expect.objectContaining({
                                        type: 'text',
                                        text: 'Error: Unknown tool: unknown_tool'
                                    })
                                ])
                            })
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should handle search_conversations with valid query', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response, results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 6,
                            method: 'tools/call',
                            params: {
                                name: 'search_conversations',
                                arguments: {
                                    query: 'test',
                                    limit: 5
                                }
                            }
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response).toMatchObject({
                            jsonrpc: '2.0',
                            id: 6,
                            result: globals_1.expect.objectContaining({
                                content: globals_1.expect.arrayContaining([
                                    globals_1.expect.objectContaining({
                                        type: 'text',
                                        text: globals_1.expect.any(String)
                                    })
                                ])
                            })
                        });
                        results = JSON.parse(response.result.content[0].text);
                        (0, globals_1.expect)(Array.isArray(results)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should handle list_sessions tool call', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response, sessions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 7,
                            method: 'tools/call',
                            params: {
                                name: 'list_sessions',
                                arguments: {}
                            }
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response).toMatchObject({
                            jsonrpc: '2.0',
                            id: 7,
                            result: globals_1.expect.objectContaining({
                                content: globals_1.expect.arrayContaining([
                                    globals_1.expect.objectContaining({
                                        type: 'text',
                                        text: globals_1.expect.any(String)
                                    })
                                ])
                            })
                        });
                        sessions = JSON.parse(response.result.content[0].text);
                        (0, globals_1.expect)(Array.isArray(sessions)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('Data Filtering and Parameters', function () {
        (0, globals_1.it)('should handle get_conversation_history with date filters', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response, history;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 8,
                            method: 'tools/call',
                            params: {
                                name: 'get_conversation_history',
                                arguments: {
                                    startDate: '2025-06-30T00:00:00.000Z',
                                    endDate: '2025-06-30T23:59:59.999Z',
                                    limit: 10
                                }
                            }
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response.jsonrpc).toBe('2.0');
                        (0, globals_1.expect)(response.id).toBe(8);
                        (0, globals_1.expect)(response.result).toBeDefined();
                        history = JSON.parse(response.result.content[0].text);
                        (0, globals_1.expect)(history).toHaveProperty('entries');
                        (0, globals_1.expect)(history).toHaveProperty('pagination');
                        (0, globals_1.expect)(Array.isArray(history.entries)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should handle list_sessions with project filter', function () { return __awaiter(void 0, void 0, void 0, function () {
            var request, response, sessions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        request = {
                            jsonrpc: '2.0',
                            id: 9,
                            method: 'tools/call',
                            params: {
                                name: 'list_sessions',
                                arguments: {
                                    projectPath: 'Users/test/project'
                                }
                            }
                        };
                        return [4 /*yield*/, sendRequest(request)];
                    case 1:
                        response = _a.sent();
                        (0, globals_1.expect)(response.jsonrpc).toBe('2.0');
                        (0, globals_1.expect)(response.id).toBe(9);
                        (0, globals_1.expect)(response.result).toBeDefined();
                        sessions = JSON.parse(response.result.content[0].text);
                        (0, globals_1.expect)(Array.isArray(sessions)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
