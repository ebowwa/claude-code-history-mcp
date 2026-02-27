"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var globals_1 = require("@jest/globals");
// Global test setup
beforeEach(function () {
    // Clear all console mocks before each test
    globals_1.jest.clearAllMocks();
});
// Mock console.error to avoid noise in tests
global.console = __assign(__assign({}, console), { error: globals_1.jest.fn(), warn: globals_1.jest.fn() });
