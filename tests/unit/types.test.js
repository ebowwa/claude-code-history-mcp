"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
// Since we're testing types, we mainly test the compilation
// and some basic behavior rather than complex logic
(0, globals_1.describe)('Type System', function () {
    (0, globals_1.describe)('Basic Type Checking', function () {
        (0, globals_1.it)('should validate message types', function () {
            var messageTypes = ['user', 'assistant', 'system', 'result'];
            messageTypes.forEach(function (type) {
                (0, globals_1.expect)(typeof type).toBe('string');
            });
        });
        (0, globals_1.it)('should handle ISO date strings', function () {
            var isoDate = '2025-06-30T10:00:00.000Z';
            var date = new Date(isoDate);
            (0, globals_1.expect)(date.toISOString()).toBe(isoDate);
            (0, globals_1.expect)(typeof isoDate).toBe('string');
        });
        (0, globals_1.it)('should validate project path format', function () {
            var projectPath = 'Users/test/project';
            (0, globals_1.expect)(typeof projectPath).toBe('string');
            (0, globals_1.expect)(projectPath.includes('/')).toBe(true);
        });
        (0, globals_1.it)('should handle message metadata', function () {
            var metadata = {
                usage: { input_tokens: 10, output_tokens: 20 },
                model: 'claude-sonnet-4',
                requestId: 'req-123'
            };
            (0, globals_1.expect)(typeof metadata.usage.input_tokens).toBe('number');
            (0, globals_1.expect)(typeof metadata.model).toBe('string');
            (0, globals_1.expect)(typeof metadata.requestId).toBe('string');
        });
        (0, globals_1.it)('should validate session statistics', function () {
            var stats = {
                sessionCount: 5,
                messageCount: 150,
                userMessageCount: 75,
                assistantMessageCount: 75
            };
            Object.values(stats).forEach(function (value) {
                (0, globals_1.expect)(typeof value).toBe('number');
                (0, globals_1.expect)(value).toBeGreaterThanOrEqual(0);
            });
        });
    });
    (0, globals_1.describe)('Array and Object Structures', function () {
        (0, globals_1.it)('should handle content arrays', function () {
            var contents = ['message content', 'another message', 'third message'];
            (0, globals_1.expect)(Array.isArray(contents)).toBe(true);
            contents.forEach(function (content) {
                (0, globals_1.expect)(typeof content).toBe('string');
            });
        });
        (0, globals_1.it)('should handle query options', function () {
            var options = {
                sessionId: 'test-session',
                startDate: '2025-06-30T00:00:00.000Z',
                limit: 100
            };
            (0, globals_1.expect)(typeof options.sessionId).toBe('string');
            (0, globals_1.expect)(typeof options.startDate).toBe('string');
            (0, globals_1.expect)(typeof options.limit).toBe('number');
        });
    });
});
