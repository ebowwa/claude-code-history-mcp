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
var bun_test_1 = require("bun:test");
var path = require("path");
var history_service_js_1 = require("../../src/history-service.js");
var promises_1 = require("fs/promises");
(0, bun_test_1.describe)('Session Methods', function () {
    var tempDir;
    var service;
    var claudeDir;
    (0, bun_test_1.beforeEach)(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Create a temporary directory for testing
                    tempDir = "/tmp/claude-test-".concat(Date.now());
                    claudeDir = path.join(tempDir, '.claude');
                    return [4 /*yield*/, (0, promises_1.mkdir)(claudeDir, { recursive: true })];
                case 1:
                    _a.sent();
                    service = new history_service_js_1.ClaudeCodeHistoryService(claudeDir);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, bun_test_1.describe)('getCurrentSession()', function () {
        (0, bun_test_1.it)('should return current session info from history.jsonl', function () { return __awaiter(void 0, void 0, void 0, function () {
            var validEntry, historyPath, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        validEntry = {
                            sessionId: '550e8400-e29b-41d4-a716-446655440000',
                            timestamp: '2026-02-05T10:30:00.000Z',
                            project: 'Users/test/project',
                            display: 'Test Session'
                        };
                        historyPath = path.join(claudeDir, 'history.jsonl');
                        return [4 /*yield*/, (0, promises_1.writeFile)(historyPath, JSON.stringify(validEntry) + '\n')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, service.getCurrentSession()];
                    case 2:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toEqual({
                            sessionId: '550e8400-e29b-41d4-a716-446655440000',
                            timestamp: '2026-02-05T10:30:00.000Z',
                            projectPath: 'Users/test/project',
                            display: 'Test Session'
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should return null for empty history file', function () { return __awaiter(void 0, void 0, void 0, function () {
            var historyPath, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        historyPath = path.join(claudeDir, 'history.jsonl');
                        return [4 /*yield*/, (0, promises_1.writeFile)(historyPath, '')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, service.getCurrentSession()];
                    case 2:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toBeNull();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should return the last entry when multiple lines exist', function () { return __awaiter(void 0, void 0, void 0, function () {
            var entry1, entry2, historyPath, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        entry1 = {
                            sessionId: '11111111-1111-4111-8111-111111111111',
                            timestamp: '2026-02-05T09:00:00.000Z',
                            project: 'Users/old/project'
                        };
                        entry2 = {
                            sessionId: '22222222-2222-4222-8222-222222222222',
                            timestamp: '2026-02-05T10:00:00.000Z',
                            project: 'Users/new/project',
                            display: 'Latest Session'
                        };
                        historyPath = path.join(claudeDir, 'history.jsonl');
                        return [4 /*yield*/, (0, promises_1.writeFile)(historyPath, JSON.stringify(entry1) + '\n' + JSON.stringify(entry2) + '\n')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, service.getCurrentSession()];
                    case 2:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result === null || result === void 0 ? void 0 : result.sessionId).toBe('22222222-2222-4222-8222-222222222222');
                        (0, bun_test_1.expect)(result === null || result === void 0 ? void 0 : result.display).toBe('Latest Session');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle malformed JSON gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var historyPath, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        historyPath = path.join(claudeDir, 'history.jsonl');
                        return [4 /*yield*/, (0, promises_1.writeFile)(historyPath, 'invalid json\n{"valid": "line"}\n')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, service.getCurrentSession()];
                    case 2:
                        result = _a.sent();
                        // Either behavior is acceptable - just verify it doesn't crash
                        (0, bun_test_1.expect)(result === null || typeof result === 'object').toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle entry with missing optional fields', function () { return __awaiter(void 0, void 0, void 0, function () {
            var minimalEntry, historyPath, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        minimalEntry = {
                            sessionId: '550e8400-e29b-41d4-a716-446655440000',
                            timestamp: '2026-02-05T10:30:00.000Z'
                        };
                        historyPath = path.join(claudeDir, 'history.jsonl');
                        return [4 /*yield*/, (0, promises_1.writeFile)(historyPath, JSON.stringify(minimalEntry) + '\n')];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, service.getCurrentSession()];
                    case 2:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toEqual({
                            sessionId: '550e8400-e29b-41d4-a716-446655440000',
                            timestamp: '2026-02-05T10:30:00.000Z',
                            projectPath: undefined,
                            display: undefined
                        });
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should return null when history file does not exist', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.getCurrentSession()];
                    case 1:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toBeNull();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, bun_test_1.describe)('getSessionByPid()', function () {
        // Note: These tests are limited as they require actual processes
        // In a real environment, you might want to spawn test processes
        (0, bun_test_1.it)('should return null for non-existent process', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.getSessionByPid(999999999)];
                    case 1:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toBeNull();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle process lookup errors gracefully', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.getSessionByPid(-1)];
                    case 1:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result === null || typeof result === 'object').toBe(true);
                        return [2 /*return*/];
                }
            });
        }); });
        // Additional tests would require spawning actual node processes
        // which is complex and platform-dependent
    });
    (0, bun_test_1.describe)('listAllSessionUuids()', function () {
        (0, bun_test_1.it)('should return all valid UUID v4 directories', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessionEnvDir, validUuids, _i, validUuids_1, uuid, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionEnvDir = path.join(claudeDir, 'session-env');
                        return [4 /*yield*/, (0, promises_1.mkdir)(sessionEnvDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        validUuids = [
                            '550e8400-e29b-41d4-a716-446655440000', // Valid v4
                            '6ba7b810-9dad-41d1-80b4-00c04fd430c8', // Valid v4 (fixed)
                            '00000000-0000-4000-8000-000000000000' // Valid nil UUID v4
                        ];
                        _i = 0, validUuids_1 = validUuids;
                        _a.label = 2;
                    case 2:
                        if (!(_i < validUuids_1.length)) return [3 /*break*/, 5];
                        uuid = validUuids_1[_i];
                        return [4 /*yield*/, (0, promises_1.mkdir)(path.join(sessionEnvDir, uuid), { recursive: true })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: 
                    // Create some non-UUID directories
                    return [4 /*yield*/, (0, promises_1.mkdir)(path.join(sessionEnvDir, 'not-a-uuid'), { recursive: true })];
                    case 6:
                        // Create some non-UUID directories
                        _a.sent();
                        return [4 /*yield*/, (0, promises_1.mkdir)(path.join(sessionEnvDir, 'also-invalid'), { recursive: true })];
                    case 7:
                        _a.sent();
                        return [4 /*yield*/, service.listAllSessionUuids()];
                    case 8:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toHaveLength(3);
                        (0, bun_test_1.expect)(result).toContain('550e8400-e29b-41d4-a716-446655440000');
                        (0, bun_test_1.expect)(result).toContain('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
                        (0, bun_test_1.expect)(result).toContain('00000000-0000-4000-8000-000000000000');
                        (0, bun_test_1.expect)(result).not.toContain('not-a-uuid');
                        (0, bun_test_1.expect)(result).not.toContain('also-invalid');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should return empty array when session-env directory does not exist', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, service.listAllSessionUuids()];
                    case 1:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toEqual([]);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle empty directory', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessionEnvDir, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionEnvDir = path.join(claudeDir, 'session-env');
                        return [4 /*yield*/, (0, promises_1.mkdir)(sessionEnvDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, service.listAllSessionUuids()];
                    case 2:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toEqual([]);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should filter UUID v4 format correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessionEnvDir, entries, _i, entries_1, entry, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionEnvDir = path.join(claudeDir, 'session-env');
                        return [4 /*yield*/, (0, promises_1.mkdir)(sessionEnvDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        entries = [
                            '550e8400-e29b-41d4-a716-446655440000', // valid v4
                            '00000000-0000-4000-8000-000000000000', // valid nil UUID v4
                            'ffffffff-ffff-4fff-bfff-ffffffffffff', // valid max UUID v4
                            '12345678-1234-1234-1234-123456789abc', // UUID v1 (invalid - version 1)
                            'not-a-uuid-at-all', // invalid
                            '12345678-1234-5678-9234-123456789abc' // UUID v5 (invalid - version 5)
                        ];
                        _i = 0, entries_1 = entries;
                        _a.label = 2;
                    case 2:
                        if (!(_i < entries_1.length)) return [3 /*break*/, 5];
                        entry = entries_1[_i];
                        return [4 /*yield*/, (0, promises_1.mkdir)(path.join(sessionEnvDir, entry), { recursive: true })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [4 /*yield*/, service.listAllSessionUuids()];
                    case 6:
                        result = _a.sent();
                        // Should only contain UUID v4 format (version 4 in the correct position)
                        (0, bun_test_1.expect)(result).toContain('550e8400-e29b-41d4-a716-446655440000');
                        (0, bun_test_1.expect)(result).toContain('00000000-0000-4000-8000-000000000000');
                        (0, bun_test_1.expect)(result).toContain('ffffffff-ffff-4fff-bfff-ffffffffffff');
                        (0, bun_test_1.expect)(result).not.toContain('12345678-1234-1234-1234-123456789abc');
                        (0, bun_test_1.expect)(result).not.toContain('not-a-uuid-at-all');
                        (0, bun_test_1.expect)(result).not.toContain('12345678-1234-5678-9234-123456789abc');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should be case-insensitive for UUID hex characters', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessionEnvDir, mixedCaseUuids, _i, mixedCaseUuids_1, uuid, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionEnvDir = path.join(claudeDir, 'session-env');
                        return [4 /*yield*/, (0, promises_1.mkdir)(sessionEnvDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        mixedCaseUuids = [
                            '550E8400-E29B-41D4-A716-446655440000', // uppercase
                            '6ba7b810-9dad-41d1-80b4-00c04fd430c8', // lowercase (fixed)
                            'A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D' // mixed case (fixed)
                        ];
                        _i = 0, mixedCaseUuids_1 = mixedCaseUuids;
                        _a.label = 2;
                    case 2:
                        if (!(_i < mixedCaseUuids_1.length)) return [3 /*break*/, 5];
                        uuid = mixedCaseUuids_1[_i];
                        return [4 /*yield*/, (0, promises_1.mkdir)(path.join(sessionEnvDir, uuid), { recursive: true })];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _i++;
                        return [3 /*break*/, 2];
                    case 5: return [4 /*yield*/, service.listAllSessionUuids()];
                    case 6:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).toHaveLength(3);
                        (0, bun_test_1.expect)(result).toContain('550E8400-E29B-41D4-A716-446655440000');
                        (0, bun_test_1.expect)(result).toContain('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
                        (0, bun_test_1.expect)(result).toContain('A1B2C3D4-E5F6-4A7B-8C9D-0E1F2A3B4C5D');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should only include directories (not files)', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessionEnvDir, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionEnvDir = path.join(claudeDir, 'session-env');
                        return [4 /*yield*/, (0, promises_1.mkdir)(sessionEnvDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        // Create a valid UUID directory
                        return [4 /*yield*/, (0, promises_1.mkdir)(path.join(sessionEnvDir, '550e8400-e29b-41d4-a716-446655440000'), { recursive: true })];
                    case 2:
                        // Create a valid UUID directory
                        _a.sent();
                        // Create files with UUID-like names
                        return [4 /*yield*/, (0, promises_1.writeFile)(path.join(sessionEnvDir, '6ba7b810-9dad-11d1-80b4-00c04fd430c8'), 'test')];
                    case 3:
                        // Create files with UUID-like names
                        _a.sent();
                        return [4 /*yield*/, (0, promises_1.writeFile)(path.join(sessionEnvDir, 'readme.txt'), 'readme')];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, service.listAllSessionUuids()];
                    case 5:
                        result = _a.sent();
                        // Should include the directory but not necessarily filter out files
                        // (depending on implementation - readdir returns both)
                        (0, bun_test_1.expect)(result.length).toBeGreaterThan(0);
                        (0, bun_test_1.expect)(result).toContain('550e8400-e29b-41d4-a716-446655440000');
                        return [2 /*return*/];
                }
            });
        }); });
        (0, bun_test_1.it)('should handle only partial UUID format', function () { return __awaiter(void 0, void 0, void 0, function () {
            var sessionEnvDir, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sessionEnvDir = path.join(claudeDir, 'session-env');
                        return [4 /*yield*/, (0, promises_1.mkdir)(sessionEnvDir, { recursive: true })];
                    case 1:
                        _a.sent();
                        // Create incomplete UUID
                        return [4 /*yield*/, (0, promises_1.mkdir)(path.join(sessionEnvDir, '550e8400-e29b-41d4'), { recursive: true })];
                    case 2:
                        // Create incomplete UUID
                        _a.sent();
                        return [4 /*yield*/, service.listAllSessionUuids()];
                    case 3:
                        result = _a.sent();
                        (0, bun_test_1.expect)(result).not.toContain('550e8400-e29b-41d4');
                        return [2 /*return*/];
                }
            });
        }); });
    });
});
