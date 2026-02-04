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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeCodeHistoryService = void 0;
var fs = require("fs/promises");
var path = require("path");
var os = require("os");
var fs_1 = require("fs");
var readline_1 = require("readline");
var ClaudeCodeHistoryService = /** @class */ (function () {
    function ClaudeCodeHistoryService(claudeDir) {
        this.claudeDir = claudeDir || path.join(os.homedir(), '.claude');
    }
    /**
     * Normalize date string to ISO format for proper comparison with timezone support
     */
    ClaudeCodeHistoryService.prototype.normalizeDate = function (dateString, isEndDate, timezone) {
        if (isEndDate === void 0) { isEndDate = false; }
        if (dateString.includes('T')) {
            return dateString;
        }
        var tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        try {
            if (tz === 'UTC') {
                var timeStr = isEndDate ? '23:59:59.999' : '00:00:00.000';
                return "".concat(dateString, "T").concat(timeStr, "Z");
            }
            // Correct approach: Create date in target timezone and convert to UTC
            var _a = dateString.split('-').map(Number), year = _a[0], month = _a[1], day = _a[2];
            var hour = isEndDate ? 23 : 0;
            var minute = isEndDate ? 59 : 0;
            var second = isEndDate ? 59 : 0;
            var millisecond = isEndDate ? 999 : 0;
            // Create a reference date to calculate offset
            var referenceDate = new Date(year, month - 1, day, 12, 0, 0); // Use noon for stable offset
            // Calculate timezone offset for this specific date (handles DST)
            var offsetMs = referenceDate.getTimezoneOffset() * 60000;
            // Create the target time in the specified timezone
            var localTime = new Date(year, month - 1, day, hour, minute, second, millisecond);
            // Get what this local time would be in the target timezone
            var targetTzTime = new Date(localTime.toLocaleString('en-CA', { timeZone: tz }));
            var utcTime = new Date(localTime.toLocaleString('en-CA', { timeZone: 'UTC' }));
            // Calculate the difference between target timezone and UTC
            var tzOffsetMs = targetTzTime.getTime() - utcTime.getTime();
            // Adjust local time to get UTC equivalent
            var utcResult = new Date(localTime.getTime() + offsetMs - tzOffsetMs);
            var result = utcResult.toISOString();
            console.log("normalizeDate: ".concat(dateString, " (").concat(isEndDate ? 'end' : 'start', ") in ").concat(tz, " -> ").concat(result));
            return result;
        }
        catch (error) {
            console.warn("Failed to process timezone ".concat(tz, ", falling back to simple conversion:"), error);
            var fallback = "".concat(dateString, "T").concat(isEndDate ? '23:59:59.999' : '00:00:00.000', "Z");
            console.log("normalizeDate fallback: ".concat(dateString, " -> ").concat(fallback));
            return fallback;
        }
    };
    ClaudeCodeHistoryService.prototype.getConversationHistory = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var sessionId, startDate, endDate, _a, limit, _b, offset, timezone, messageTypes, normalizedStartDate, normalizedEndDate, allowedTypes, allEntries, totalCount, paginatedEntries, hasMore;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        sessionId = options.sessionId, startDate = options.startDate, endDate = options.endDate, _a = options.limit, limit = _a === void 0 ? 20 : _a, _b = options.offset, offset = _b === void 0 ? 0 : _b, timezone = options.timezone, messageTypes = options.messageTypes;
                        normalizedStartDate = startDate ? this.normalizeDate(startDate, false, timezone) : undefined;
                        normalizedEndDate = endDate ? this.normalizeDate(endDate, true, timezone) : undefined;
                        allowedTypes = messageTypes && messageTypes.length > 0 ? messageTypes : ['user'];
                        return [4 /*yield*/, this.loadClaudeHistoryEntries({
                                startDate: normalizedStartDate,
                                endDate: normalizedEndDate
                            })];
                    case 1:
                        allEntries = _c.sent();
                        // Filter by session ID if specified
                        if (sessionId) {
                            allEntries = allEntries.filter(function (entry) { return entry.sessionId === sessionId; });
                        }
                        // Filter by message types (defaults to user only)
                        allEntries = allEntries.filter(function (entry) { return allowedTypes.includes(entry.type); });
                        // Filter by date range if specified (additional in-memory filtering for precision)
                        if (normalizedStartDate) {
                            allEntries = allEntries.filter(function (entry) {
                                return entry.timestamp >= normalizedStartDate;
                            });
                        }
                        if (normalizedEndDate) {
                            allEntries = allEntries.filter(function (entry) {
                                return entry.timestamp <= normalizedEndDate;
                            });
                        }
                        // Sort by timestamp (newest first)
                        allEntries.sort(function (a, b) { return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); });
                        totalCount = allEntries.length;
                        paginatedEntries = allEntries.slice(offset, offset + limit);
                        hasMore = offset + limit < totalCount;
                        return [2 /*return*/, {
                                entries: paginatedEntries,
                                pagination: {
                                    total_count: totalCount,
                                    limit: limit,
                                    offset: offset,
                                    has_more: hasMore
                                }
                            }];
                }
            });
        });
    };
    ClaudeCodeHistoryService.prototype.searchConversations = function (searchQuery_1) {
        return __awaiter(this, arguments, void 0, function (searchQuery, options) {
            var _a, limit, projectPath, startDate, endDate, timezone, normalizedStartDate, normalizedEndDate, allEntries, queryLower, matchedEntries;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = options.limit, limit = _a === void 0 ? 30 : _a, projectPath = options.projectPath, startDate = options.startDate, endDate = options.endDate, timezone = options.timezone;
                        normalizedStartDate = startDate ? this.normalizeDate(startDate, false, timezone) : undefined;
                        normalizedEndDate = endDate ? this.normalizeDate(endDate, true, timezone) : undefined;
                        return [4 /*yield*/, this.loadClaudeHistoryEntries({
                                startDate: normalizedStartDate,
                                endDate: normalizedEndDate
                            })];
                    case 1:
                        allEntries = _b.sent();
                        queryLower = searchQuery.toLowerCase();
                        matchedEntries = allEntries.filter(function (entry) {
                            return entry.content.toLowerCase().includes(queryLower);
                        });
                        // Filter by project path if specified
                        if (projectPath) {
                            matchedEntries = matchedEntries.filter(function (entry) { return entry.projectPath === projectPath; });
                        }
                        // Filter by date range if specified (additional in-memory filtering for precision)
                        if (normalizedStartDate) {
                            matchedEntries = matchedEntries.filter(function (entry) {
                                return entry.timestamp >= normalizedStartDate;
                            });
                        }
                        if (normalizedEndDate) {
                            matchedEntries = matchedEntries.filter(function (entry) {
                                return entry.timestamp <= normalizedEndDate;
                            });
                        }
                        matchedEntries.sort(function (a, b) { return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(); });
                        return [2 /*return*/, matchedEntries.slice(0, limit)];
                }
            });
        });
    };
    ClaudeCodeHistoryService.prototype.listProjects = function () {
        return __awaiter(this, void 0, void 0, function () {
            var projects, projectsDir, projectDirs, _i, projectDirs_1, projectDir, projectPath, stats, files, decodedPath, projectInfo, _a, files_1, file, sessionId, filePath, fileStats, entries, error_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        projects = new Map();
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 12, , 13]);
                        projectsDir = path.join(this.claudeDir, 'projects');
                        return [4 /*yield*/, fs.readdir(projectsDir)];
                    case 2:
                        projectDirs = _b.sent();
                        _i = 0, projectDirs_1 = projectDirs;
                        _b.label = 3;
                    case 3:
                        if (!(_i < projectDirs_1.length)) return [3 /*break*/, 11];
                        projectDir = projectDirs_1[_i];
                        projectPath = path.join(projectsDir, projectDir);
                        return [4 /*yield*/, fs.stat(projectPath)];
                    case 4:
                        stats = _b.sent();
                        if (!stats.isDirectory()) return [3 /*break*/, 10];
                        return [4 /*yield*/, fs.readdir(projectPath)];
                    case 5:
                        files = _b.sent();
                        decodedPath = this.decodeProjectPath(projectDir);
                        if (!projects.has(decodedPath)) {
                            projects.set(decodedPath, {
                                sessionIds: new Set(),
                                messageCount: 0,
                                lastActivityTime: '1970-01-01T00:00:00.000Z'
                            });
                        }
                        projectInfo = projects.get(decodedPath);
                        if (!projectInfo)
                            return [3 /*break*/, 10];
                        _a = 0, files_1 = files;
                        _b.label = 6;
                    case 6:
                        if (!(_a < files_1.length)) return [3 /*break*/, 10];
                        file = files_1[_a];
                        if (!file.endsWith('.jsonl')) return [3 /*break*/, 9];
                        sessionId = file.replace('.jsonl', '');
                        projectInfo.sessionIds.add(sessionId);
                        filePath = path.join(projectPath, file);
                        return [4 /*yield*/, fs.stat(filePath)];
                    case 7:
                        fileStats = _b.sent();
                        if (fileStats.mtime.toISOString() > projectInfo.lastActivityTime) {
                            projectInfo.lastActivityTime = fileStats.mtime.toISOString();
                        }
                        return [4 /*yield*/, this.parseJsonlFile(filePath, projectDir)];
                    case 8:
                        entries = _b.sent();
                        projectInfo.messageCount += entries.length;
                        _b.label = 9;
                    case 9:
                        _a++;
                        return [3 /*break*/, 6];
                    case 10:
                        _i++;
                        return [3 /*break*/, 3];
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        error_1 = _b.sent();
                        console.error('Error listing projects:', error_1);
                        return [3 /*break*/, 13];
                    case 13: return [2 /*return*/, Array.from(projects.entries()).map(function (_a) {
                            var projectPath = _a[0], info = _a[1];
                            return ({
                                projectPath: projectPath,
                                sessionCount: info.sessionIds.size,
                                messageCount: info.messageCount,
                                lastActivityTime: info.lastActivityTime
                            });
                        })];
                }
            });
        });
    };
    ClaudeCodeHistoryService.prototype.listSessions = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var projectPath, startDate, endDate, timezone, normalizedStartDate, normalizedEndDate, sessions, projectsDir, projectDirs, _i, projectDirs_2, projectDir, decodedPath, projectDirPath, stats, files, _a, files_2, file, sessionId, filePath, entries, sessionStart, sessionEnd, userMessageCount, assistantMessageCount, error_2;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        projectPath = options.projectPath, startDate = options.startDate, endDate = options.endDate, timezone = options.timezone;
                        normalizedStartDate = startDate ? this.normalizeDate(startDate, false, timezone) : undefined;
                        normalizedEndDate = endDate ? this.normalizeDate(endDate, true, timezone) : undefined;
                        sessions = [];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 11, , 12]);
                        projectsDir = path.join(this.claudeDir, 'projects');
                        return [4 /*yield*/, fs.readdir(projectsDir)];
                    case 2:
                        projectDirs = _b.sent();
                        _i = 0, projectDirs_2 = projectDirs;
                        _b.label = 3;
                    case 3:
                        if (!(_i < projectDirs_2.length)) return [3 /*break*/, 10];
                        projectDir = projectDirs_2[_i];
                        decodedPath = this.decodeProjectPath(projectDir);
                        // Filter by project path if specified
                        if (projectPath && decodedPath !== projectPath) {
                            return [3 /*break*/, 9];
                        }
                        projectDirPath = path.join(projectsDir, projectDir);
                        return [4 /*yield*/, fs.stat(projectDirPath)];
                    case 4:
                        stats = _b.sent();
                        if (!stats.isDirectory()) return [3 /*break*/, 9];
                        return [4 /*yield*/, fs.readdir(projectDirPath)];
                    case 5:
                        files = _b.sent();
                        _a = 0, files_2 = files;
                        _b.label = 6;
                    case 6:
                        if (!(_a < files_2.length)) return [3 /*break*/, 9];
                        file = files_2[_a];
                        if (!file.endsWith('.jsonl')) return [3 /*break*/, 8];
                        sessionId = file.replace('.jsonl', '');
                        filePath = path.join(projectDirPath, file);
                        return [4 /*yield*/, this.parseJsonlFile(filePath, projectDir)];
                    case 7:
                        entries = _b.sent();
                        if (entries.length === 0)
                            return [3 /*break*/, 8];
                        sessionStart = entries[entries.length - 1].timestamp;
                        sessionEnd = entries[0].timestamp;
                        // Filter by date range if specified
                        if (normalizedStartDate && sessionEnd < normalizedStartDate)
                            return [3 /*break*/, 8];
                        if (normalizedEndDate && sessionStart > normalizedEndDate)
                            return [3 /*break*/, 8];
                        userMessageCount = entries.filter(function (e) { return e.type === 'user'; }).length;
                        assistantMessageCount = entries.filter(function (e) { return e.type === 'assistant'; }).length;
                        sessions.push({
                            sessionId: sessionId,
                            projectPath: decodedPath,
                            startTime: sessionStart,
                            endTime: sessionEnd,
                            messageCount: entries.length,
                            userMessageCount: userMessageCount,
                            assistantMessageCount: assistantMessageCount
                        });
                        _b.label = 8;
                    case 8:
                        _a++;
                        return [3 /*break*/, 6];
                    case 9:
                        _i++;
                        return [3 /*break*/, 3];
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        error_2 = _b.sent();
                        console.error('Error listing sessions:', error_2);
                        return [3 /*break*/, 12];
                    case 12:
                        // Sort by start time (newest first)
                        sessions.sort(function (a, b) { return new Date(b.startTime).getTime() - new Date(a.startTime).getTime(); });
                        return [2 /*return*/, sessions];
                }
            });
        });
    };
    ClaudeCodeHistoryService.prototype.loadClaudeHistoryEntries = function () {
        return __awaiter(this, arguments, void 0, function (options) {
            var entries, startDate, endDate, projectsDir, projectDirs, _i, projectDirs_3, projectDir, projectPath, stats, files, _a, files_3, file, filePath, sessionEntries, error_3;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        entries = [];
                        startDate = options.startDate, endDate = options.endDate;
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 12, , 13]);
                        projectsDir = path.join(this.claudeDir, 'projects');
                        return [4 /*yield*/, fs.readdir(projectsDir)];
                    case 2:
                        projectDirs = _b.sent();
                        _i = 0, projectDirs_3 = projectDirs;
                        _b.label = 3;
                    case 3:
                        if (!(_i < projectDirs_3.length)) return [3 /*break*/, 11];
                        projectDir = projectDirs_3[_i];
                        projectPath = path.join(projectsDir, projectDir);
                        return [4 /*yield*/, fs.stat(projectPath)];
                    case 4:
                        stats = _b.sent();
                        if (!stats.isDirectory()) return [3 /*break*/, 10];
                        return [4 /*yield*/, fs.readdir(projectPath)];
                    case 5:
                        files = _b.sent();
                        _a = 0, files_3 = files;
                        _b.label = 6;
                    case 6:
                        if (!(_a < files_3.length)) return [3 /*break*/, 10];
                        file = files_3[_a];
                        if (!file.endsWith('.jsonl')) return [3 /*break*/, 9];
                        filePath = path.join(projectPath, file);
                        return [4 /*yield*/, this.shouldSkipFile(filePath, startDate, endDate)];
                    case 7:
                        // Pre-filter files based on modification time
                        if (_b.sent()) {
                            return [3 /*break*/, 9];
                        }
                        return [4 /*yield*/, this.parseJsonlFile(filePath, projectDir, startDate, endDate)];
                    case 8:
                        sessionEntries = _b.sent();
                        entries.push.apply(entries, sessionEntries);
                        _b.label = 9;
                    case 9:
                        _a++;
                        return [3 /*break*/, 6];
                    case 10:
                        _i++;
                        return [3 /*break*/, 3];
                    case 11: return [3 /*break*/, 13];
                    case 12:
                        error_3 = _b.sent();
                        console.error('Error loading Claude history:', error_3);
                        return [3 /*break*/, 13];
                    case 13: return [2 /*return*/, entries];
                }
            });
        });
    };
    ClaudeCodeHistoryService.prototype.parseJsonlFile = function (filePath, projectDir, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var entries, fileStream, rl, _a, rl_1, rl_1_1, line, claudeMessage, entry, e_1_1, error_4;
            var _b, e_1, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        entries = [];
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 14, , 15]);
                        fileStream = (0, fs_1.createReadStream)(filePath);
                        rl = (0, readline_1.createInterface)({
                            input: fileStream,
                            crlfDelay: Infinity
                        });
                        _e.label = 2;
                    case 2:
                        _e.trys.push([2, 7, 8, 13]);
                        _a = true, rl_1 = __asyncValues(rl);
                        _e.label = 3;
                    case 3: return [4 /*yield*/, rl_1.next()];
                    case 4:
                        if (!(rl_1_1 = _e.sent(), _b = rl_1_1.done, !_b)) return [3 /*break*/, 6];
                        _d = rl_1_1.value;
                        _a = false;
                        line = _d;
                        if (line.trim()) {
                            try {
                                claudeMessage = JSON.parse(line);
                                // Apply date filtering at message level for efficiency
                                if (startDate && claudeMessage.timestamp < startDate) {
                                    return [3 /*break*/, 5];
                                }
                                if (endDate && claudeMessage.timestamp > endDate) {
                                    return [3 /*break*/, 5];
                                }
                                entry = this.convertClaudeMessageToEntry(claudeMessage, projectDir);
                                if (entry) {
                                    entries.push(entry);
                                }
                            }
                            catch (parseError) {
                                console.error('Error parsing line:', parseError);
                            }
                        }
                        _e.label = 5;
                    case 5:
                        _a = true;
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 13];
                    case 7:
                        e_1_1 = _e.sent();
                        e_1 = { error: e_1_1 };
                        return [3 /*break*/, 13];
                    case 8:
                        _e.trys.push([8, , 11, 12]);
                        if (!(!_a && !_b && (_c = rl_1.return))) return [3 /*break*/, 10];
                        return [4 /*yield*/, _c.call(rl_1)];
                    case 9:
                        _e.sent();
                        _e.label = 10;
                    case 10: return [3 /*break*/, 12];
                    case 11:
                        if (e_1) throw e_1.error;
                        return [7 /*endfinally*/];
                    case 12: return [7 /*endfinally*/];
                    case 13: return [3 /*break*/, 15];
                    case 14:
                        error_4 = _e.sent();
                        console.error('Error reading file:', filePath, error_4);
                        return [3 /*break*/, 15];
                    case 15: return [2 /*return*/, entries];
                }
            });
        });
    };
    ClaudeCodeHistoryService.prototype.convertClaudeMessageToEntry = function (claudeMessage, projectDir) {
        var _a, _b, _c;
        try {
            var content = '';
            if ((_a = claudeMessage.message) === null || _a === void 0 ? void 0 : _a.content) {
                if (typeof claudeMessage.message.content === 'string') {
                    content = claudeMessage.message.content;
                }
                else if (Array.isArray(claudeMessage.message.content)) {
                    // Handle array content (e.g., from assistant messages)
                    content = claudeMessage.message.content
                        .map(function (item) {
                        if (typeof item === 'string')
                            return item;
                        if ((item === null || item === void 0 ? void 0 : item.type) === 'text' && (item === null || item === void 0 ? void 0 : item.text))
                            return item.text;
                        return JSON.stringify(item);
                    })
                        .join(' ');
                }
            }
            // Decode project path from directory name
            var projectPath = this.decodeProjectPath(projectDir);
            // Add enhanced time information
            var timestamp = claudeMessage.timestamp;
            var messageDate = new Date(timestamp);
            return {
                sessionId: claudeMessage.sessionId,
                timestamp: timestamp,
                type: claudeMessage.type,
                content: content,
                projectPath: projectPath,
                uuid: claudeMessage.uuid,
                formattedTime: messageDate.toLocaleString('en-US', {
                    timeZone: 'Asia/Tokyo',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }),
                timeAgo: this.getTimeAgo(messageDate),
                localDate: messageDate.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }),
                metadata: {
                    usage: (_b = claudeMessage.message) === null || _b === void 0 ? void 0 : _b.usage,
                    model: (_c = claudeMessage.message) === null || _c === void 0 ? void 0 : _c.model,
                    requestId: claudeMessage.requestId
                }
            };
        }
        catch (error) {
            console.error('Error converting Claude message:', error);
            return null;
        }
    };
    ClaudeCodeHistoryService.prototype.getTimeAgo = function (date) {
        var now = new Date();
        var diffMs = now.getTime() - date.getTime();
        var diffMins = Math.floor(diffMs / (1000 * 60));
        var diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        var diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (diffMins < 1)
            return 'just now';
        if (diffMins < 60)
            return "".concat(diffMins, "m ago");
        if (diffHours < 24)
            return "".concat(diffHours, "h ago");
        if (diffDays < 7)
            return "".concat(diffDays, "d ago");
        if (diffDays < 30)
            return "".concat(Math.floor(diffDays / 7), "w ago");
        if (diffDays < 365)
            return "".concat(Math.floor(diffDays / 30), "mo ago");
        return "".concat(Math.floor(diffDays / 365), "y ago");
    };
    ClaudeCodeHistoryService.prototype.decodeProjectPath = function (projectDir) {
        return projectDir.replace(/-/g, '/').replace(/^\//, '');
    };
    /**
     * Determines whether to skip reading a file based on its modification time
     */
    ClaudeCodeHistoryService.prototype.shouldSkipFile = function (filePath, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function () {
            var fileStats, fileModTime, fileCreateTime, oldestPossibleTime, newestPossibleTime, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!startDate && !endDate) {
                            return [2 /*return*/, false]; // Don't skip if no date filters are specified
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, fs.stat(filePath)];
                    case 2:
                        fileStats = _a.sent();
                        fileModTime = fileStats.mtime.toISOString();
                        fileCreateTime = fileStats.birthtime.toISOString();
                        oldestPossibleTime = fileCreateTime < fileModTime ? fileCreateTime : fileModTime;
                        newestPossibleTime = fileModTime;
                        // If endDate is specified: skip if file's oldest time is after endDate
                        if (endDate && oldestPossibleTime > endDate) {
                            return [2 /*return*/, true]; // Skip
                        }
                        // If startDate is specified: skip if file's newest time is before startDate
                        if (startDate && newestPossibleTime < startDate) {
                            return [2 /*return*/, true]; // Skip
                        }
                        return [2 /*return*/, false]; // File might contain data in range, so read it
                    case 3:
                        error_5 = _a.sent();
                        console.warn("Failed to get file stats for ".concat(filePath, ":"), error_5);
                        return [2 /*return*/, false]; // Safe fallback: read the file if stat fails
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return ClaudeCodeHistoryService;
}());
exports.ClaudeCodeHistoryService = ClaudeCodeHistoryService;
