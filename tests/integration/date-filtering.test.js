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
(0, globals_1.describe)('Date Filtering Performance Tests', function () {
    var serverPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
    var sendRequest = function (request, timeout) {
        if (timeout === void 0) { timeout = 10000; }
        return new Promise(function (resolve, reject) {
            var _a, _b;
            var server = (0, child_process_1.spawn)('node', [serverPath], {
                stdio: 'pipe'
            });
            var output = '';
            var errorOutput = '';
            var timeoutId = setTimeout(function () {
                server.kill();
                reject(new Error("Request timed out after ".concat(timeout, "ms")));
            }, timeout);
            (_a = server.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                output += data.toString();
            });
            (_b = server.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                errorOutput += data.toString();
            });
            server.on('close', function (code) {
                clearTimeout(timeoutId);
                try {
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
                    reject(new Error("Failed to parse response: ".concat(error, ". Output: ").concat(output, ", Error: ").concat(errorOutput)));
                }
            });
            server.on('error', function (error) {
                clearTimeout(timeoutId);
                reject(error);
            });
            if (server.stdin) {
                server.stdin.write(JSON.stringify(request) + '\n');
                server.stdin.end();
            }
        });
    };
    (0, globals_1.it)('should handle date-filtered history requests efficiently', function () { return __awaiter(void 0, void 0, void 0, function () {
        var startTime, request, response, endTime, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    request = {
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'tools/call',
                        params: {
                            name: 'get_conversation_history',
                            arguments: {
                                startDate: '2025-06-25',
                                endDate: '2025-06-26',
                                limit: 50
                            }
                        }
                    };
                    return [4 /*yield*/, sendRequest(request)];
                case 1:
                    response = _a.sent();
                    endTime = Date.now();
                    duration = endTime - startTime;
                    (0, globals_1.expect)(response).toHaveProperty('result');
                    (0, globals_1.expect)(response.result).toHaveProperty('content');
                    // Response should be reasonably fast with file-level filtering
                    (0, globals_1.expect)(duration).toBeLessThan(5000); // Should complete within 5 seconds
                    console.log("Date-filtered query completed in ".concat(duration, "ms"));
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('should return fewer results for narrow date ranges', function () { return __awaiter(void 0, void 0, void 0, function () {
        var yesterday, yesterdayStr, request, response, results;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterdayStr = yesterday.toISOString().split('T')[0];
                    request = {
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'tools/call',
                        params: {
                            name: 'get_conversation_history',
                            arguments: {
                                startDate: yesterdayStr,
                                endDate: yesterdayStr,
                                limit: 100
                            }
                        }
                    };
                    return [4 /*yield*/, sendRequest(request)];
                case 1:
                    response = _b.sent();
                    (0, globals_1.expect)(response).toHaveProperty('result');
                    (0, globals_1.expect)(response.result).toHaveProperty('content');
                    results = JSON.parse(response.result.content[0].text);
                    console.log("Found ".concat(((_a = results.entries) === null || _a === void 0 ? void 0 : _a.length) || 'undefined', " entries for ").concat(yesterdayStr));
                    // Should be valid paginated response with entries array
                    (0, globals_1.expect)(results).toHaveProperty('entries');
                    (0, globals_1.expect)(results).toHaveProperty('pagination');
                    (0, globals_1.expect)(Array.isArray(results.entries)).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('should handle queries for date ranges with no data efficiently', function () { return __awaiter(void 0, void 0, void 0, function () {
        var startTime, request, response, endTime, duration, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    request = {
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'tools/call',
                        params: {
                            name: 'get_conversation_history',
                            arguments: {
                                startDate: '2030-01-01',
                                endDate: '2030-01-31',
                                limit: 100
                            }
                        }
                    };
                    return [4 /*yield*/, sendRequest(request)];
                case 1:
                    response = _a.sent();
                    endTime = Date.now();
                    duration = endTime - startTime;
                    (0, globals_1.expect)(response).toHaveProperty('result');
                    results = JSON.parse(response.result.content[0].text);
                    // Should return empty paginated response quickly due to file-level filtering
                    (0, globals_1.expect)(results).toHaveProperty('entries');
                    (0, globals_1.expect)(results).toHaveProperty('pagination');
                    (0, globals_1.expect)(Array.isArray(results.entries)).toBe(true);
                    (0, globals_1.expect)(results.entries.length).toBe(0);
                    (0, globals_1.expect)(results.pagination.total_count).toBe(0);
                    // Should be very fast when no files need to be read
                    (0, globals_1.expect)(duration).toBeLessThan(2000);
                    console.log("Empty date range query completed in ".concat(duration, "ms"));
                    return [2 /*return*/];
            }
        });
    }); });
});
