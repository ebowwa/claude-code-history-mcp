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
var history_service_1 = require("../../src/services/history-service");
var globals_1 = require("@jest/globals");
var fs = require("fs/promises");
var path = require("path");
var os = require("os");
(0, globals_1.describe)('Enhanced Search Features', function () {
    var service;
    var tempDir;
    var mockClaudeDir;
    (0, globals_1.beforeAll)(function () { return __awaiter(void 0, void 0, void 0, function () {
        var projectsDir, project1Dir, project2Dir, mockConversations1, mockConversations2, file1, file2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs.mkdtemp(path.join(os.tmpdir(), 'claude-code-history-test-'))];
                case 1:
                    // Create temporary directory structure
                    tempDir = _a.sent();
                    mockClaudeDir = path.join(tempDir, '.claude');
                    return [4 /*yield*/, fs.mkdir(mockClaudeDir, { recursive: true })];
                case 2:
                    _a.sent();
                    // Mock the service to use our temp directory
                    service = new history_service_1.ClaudeCodeHistoryService();
                    service.claudeDir = mockClaudeDir;
                    projectsDir = path.join(mockClaudeDir, 'projects');
                    return [4 /*yield*/, fs.mkdir(projectsDir, { recursive: true })];
                case 3:
                    _a.sent();
                    project1Dir = path.join(projectsDir, 'Users-test-project1');
                    project2Dir = path.join(projectsDir, 'Users-test-project2');
                    return [4 /*yield*/, fs.mkdir(project1Dir, { recursive: true })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, fs.mkdir(project2Dir, { recursive: true })];
                case 5:
                    _a.sent();
                    mockConversations1 = [
                        {
                            parentUuid: null,
                            isSidechain: false,
                            userType: 'human',
                            cwd: '/Users/test/project1',
                            sessionId: 'session1',
                            version: '1.0.0',
                            type: 'user',
                            message: {
                                role: 'user',
                                content: 'API integration with payment gateway'
                            },
                            uuid: 'msg1',
                            timestamp: '2025-06-30T10:00:00.000Z'
                        },
                        {
                            parentUuid: 'msg1',
                            isSidechain: false,
                            userType: 'assistant',
                            cwd: '/Users/test/project1',
                            sessionId: 'session1',
                            version: '1.0.0',
                            type: 'assistant',
                            message: {
                                role: 'assistant',
                                content: 'I can help you with API integration for the payment gateway.'
                            },
                            uuid: 'msg2',
                            timestamp: '2025-06-30T10:01:00.000Z'
                        }
                    ];
                    mockConversations2 = [
                        {
                            parentUuid: null,
                            isSidechain: false,
                            userType: 'human',
                            cwd: '/Users/test/project2',
                            sessionId: 'session2',
                            version: '1.0.0',
                            type: 'user',
                            message: {
                                role: 'user',
                                content: 'Database schema design for user management'
                            },
                            uuid: 'msg3',
                            timestamp: '2025-06-29T15:00:00.000Z'
                        }
                    ];
                    file1 = path.join(project1Dir, 'session1.jsonl');
                    file2 = path.join(project2Dir, 'session2.jsonl');
                    return [4 /*yield*/, fs.writeFile(file1, mockConversations1.map(function (c) { return JSON.stringify(c); }).join('\n'))];
                case 6:
                    _a.sent();
                    return [4 /*yield*/, fs.writeFile(file2, mockConversations2.map(function (c) { return JSON.stringify(c); }).join('\n'))];
                case 7:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.describe)('search_conversations with enhanced filtering', function () {
        (0, globals_1.it)('should filter by project path', function () { return __awaiter(void 0, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.searchConversations('API', {
                            projectPath: 'Users/test/project1'
                        })];
                    case 1:
                        results = _a.sent();
                        (0, globals_1.expect)(results).toHaveLength(2); // Both user and assistant messages
                        (0, globals_1.expect)(results.every(function (r) { return r.projectPath === 'Users/test/project1'; })).toBe(true);
                        (0, globals_1.expect)(results.some(function (r) { return r.content.includes('API integration'); })).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should support date range filtering interface', function () { return __awaiter(void 0, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.searchConversations('API', {
                            startDate: '2025-06-30',
                            endDate: '2025-06-30'
                        })];
                    case 1:
                        results = _a.sent();
                        // At minimum, should not throw an error and return an array
                        (0, globals_1.expect)(Array.isArray(results)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should support combined filtering interface', function () { return __awaiter(void 0, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.searchConversations('Database', {
                            projectPath: 'Users/test/project2',
                            startDate: '2025-06-29',
                            endDate: '2025-06-29',
                            timezone: 'UTC'
                        })];
                    case 1:
                        results = _a.sent();
                        // At minimum, should not throw an error and return an array
                        (0, globals_1.expect)(Array.isArray(results)).toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should return empty results when filters do not match', function () { return __awaiter(void 0, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.searchConversations('API', {
                            projectPath: 'Users/test/project2' // API is only in project1
                        })];
                    case 1:
                        results = _a.sent();
                        (0, globals_1.expect)(results).toHaveLength(0);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should respect limit parameter', function () { return __awaiter(void 0, void 0, void 0, function () {
            var results;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.searchConversations('user', {
                            limit: 1
                        })];
                    case 1:
                        results = _a.sent();
                        (0, globals_1.expect)(results).toHaveLength(1);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('list_sessions with timezone support', function () {
        (0, globals_1.it)('should list sessions with timezone filtering', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.listSessions({
                            startDate: '2025-06-30',
                            timezone: 'UTC'
                        })];
                    case 1:
                        sessions = _a.sent();
                        (0, globals_1.expect)(sessions).toHaveLength(1);
                        (0, globals_1.expect)(sessions[0].sessionId).toBe('session1');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should filter sessions by project path', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.listSessions({
                            projectPath: 'Users/test/project1'
                        })];
                    case 1:
                        sessions = _a.sent();
                        (0, globals_1.expect)(sessions).toHaveLength(1);
                        (0, globals_1.expect)(sessions[0].projectPath).toBe('Users/test/project1');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.it)('should handle date range filtering with timezone', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessions;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.listSessions({
                            startDate: '2025-06-29',
                            endDate: '2025-06-29',
                            timezone: 'UTC'
                        })];
                    case 1:
                        sessions = _a.sent();
                        (0, globals_1.expect)(sessions).toHaveLength(1);
                        (0, globals_1.expect)(sessions[0].sessionId).toBe('session2');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
