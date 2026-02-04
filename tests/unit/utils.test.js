"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
(0, globals_1.describe)('Utility Functions', function () {
    (0, globals_1.describe)('Date Filtering', function () {
        (0, globals_1.it)('should compare ISO date strings correctly', function () {
            var date1 = '2025-06-30T10:00:00.000Z';
            var date2 = '2025-06-30T11:00:00.000Z';
            var date3 = '2025-06-29T10:00:00.000Z';
            // String comparison should work for ISO dates
            (0, globals_1.expect)(date2 > date1).toBe(true);
            (0, globals_1.expect)(date1 > date3).toBe(true);
            (0, globals_1.expect)(date3 < date1).toBe(true);
        });
        (0, globals_1.it)('should handle date range filtering', function () {
            var entries = [
                { timestamp: '2025-06-30T09:00:00.000Z', content: 'entry1' },
                { timestamp: '2025-06-30T10:00:00.000Z', content: 'entry2' },
                { timestamp: '2025-06-30T11:00:00.000Z', content: 'entry3' },
            ];
            var startDate = '2025-06-30T09:30:00.000Z';
            var endDate = '2025-06-30T10:30:00.000Z';
            var filtered = entries.filter(function (entry) {
                return entry.timestamp >= startDate && entry.timestamp <= endDate;
            });
            (0, globals_1.expect)(filtered).toHaveLength(1);
            (0, globals_1.expect)(filtered[0].content).toBe('entry2');
        });
    });
    (0, globals_1.describe)('Array Sorting', function () {
        (0, globals_1.it)('should sort entries by timestamp descending', function () {
            var entries = [
                { timestamp: '2025-06-30T09:00:00.000Z', id: 'entry1' },
                { timestamp: '2025-06-30T11:00:00.000Z', id: 'entry3' },
                { timestamp: '2025-06-30T10:00:00.000Z', id: 'entry2' },
            ];
            var sorted = entries.sort(function (a, b) {
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            (0, globals_1.expect)(sorted[0].id).toBe('entry3');
            (0, globals_1.expect)(sorted[1].id).toBe('entry2');
            (0, globals_1.expect)(sorted[2].id).toBe('entry1');
        });
    });
    (0, globals_1.describe)('String Processing', function () {
        (0, globals_1.it)('should handle case-insensitive search', function () {
            var content = 'Fix the bug in the authentication module';
            var query = 'BUG';
            var matches = content.toLowerCase().includes(query.toLowerCase());
            (0, globals_1.expect)(matches).toBe(true);
        });
        (0, globals_1.it)('should extract text from array content', function () {
            var arrayContent = [
                { type: 'text', text: 'Hello' },
                { type: 'text', text: 'World' },
                'Plain string'
            ];
            var extracted = arrayContent
                .map(function (item) {
                if (typeof item === 'string')
                    return item;
                if ((item === null || item === void 0 ? void 0 : item.type) === 'text' && (item === null || item === void 0 ? void 0 : item.text))
                    return item.text;
                return JSON.stringify(item);
            })
                .join(' ');
            (0, globals_1.expect)(extracted).toBe('Hello World Plain string');
        });
        (0, globals_1.it)('should decode project paths', function () {
            var encoded = '-Users-test-project-name';
            var decoded = encoded.replace(/-/g, '/').replace(/^\//, '');
            (0, globals_1.expect)(decoded).toBe('Users/test/project/name');
        });
    });
    (0, globals_1.describe)('JSON Processing', function () {
        (0, globals_1.it)('should parse valid JSON lines', function () {
            var jsonLine = '{"type":"user","content":"test message"}';
            var parsed = JSON.parse(jsonLine);
            (0, globals_1.expect)(parsed.type).toBe('user');
            (0, globals_1.expect)(parsed.content).toBe('test message');
        });
        (0, globals_1.it)('should handle JSON parsing errors gracefully', function () {
            var invalidJsonLine = 'invalid json';
            var result = null;
            var error = null;
            try {
                result = JSON.parse(invalidJsonLine);
            }
            catch (e) {
                error = e;
            }
            (0, globals_1.expect)(result).toBeNull();
            (0, globals_1.expect)(error).toBeInstanceOf(Error);
        });
        (0, globals_1.it)('should stringify objects correctly', function () {
            var obj = {
                sessionId: 'test-123',
                messageCount: 10,
                topics: ['bug fix', 'feature']
            };
            var jsonString = JSON.stringify(obj, null, 2);
            var parsed = JSON.parse(jsonString);
            (0, globals_1.expect)(parsed.sessionId).toBe('test-123');
            (0, globals_1.expect)(parsed.messageCount).toBe(10);
            (0, globals_1.expect)(parsed.topics).toEqual(['bug fix', 'feature']);
        });
    });
});
