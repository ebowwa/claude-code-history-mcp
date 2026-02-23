/**
 * @ebowwa/claudecodehistory-wasm
 * TypeScript wrapper for the WASM-based Claude Code history parser
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import type {
  ConversationEntry,
  BatchParseResult,
  ParseOptions,
  SearchOptions,
  SearchResult,
  WasmInitOptions,
  WasmStatus,
  ClaudeCodeMessage,
} from '../types/index.js';

import {
  parseJsonlContentTS,
  parseJsonlContentDetailedTS,
  searchEntriesTS,
  validateJsonlLineTS,
  extractContentTS,
} from './ts-fallback.js';

// Package version (will be replaced during build)
const PACKAGE_VERSION = '0.1.0';

// Module state
let wasmModule: any = null;
let isInitialized = false;
let isUsingFallback = false;
let initError: string | undefined;
let loadTimeMs: number | undefined;

// WASM module type for nodejs target (wasm-pack --target nodejs)
// Function names have _wasm suffix
interface WasmModule {
  parse_jsonl_wasm(content: string): any[];
  parse_jsonl_with_metadata(content: string, file_path: string): any;
  search_entries_wasm(entries: any[], query: string): any[];
  search_entries_detailed_wasm(entries: any[], query: string, options: any): any[];
  get_version(): string;
  init_wasm(): void;
}

/**
 * Initialize the WASM module
 * Must be called before using any parsing functions
 */
export async function init(options: WasmInitOptions = {}): Promise<WasmStatus> {
  const startTime = Date.now();
  const { enableFallback = true, debug = false } = options;

  if (isInitialized) {
    return getStatus();
  }

  try {
    // Try to load WASM module from pkg-node (nodejs target)
    // The nodejs target uses synchronous loading and exports functions directly
    const wasmPath = options.wasmPath || path.join(__dirname, '..', 'pkg-node', 'claudecodehistory_wasm.js');

    if (debug) {
      console.log(`[claudecodehistory-wasm] Attempting to load WASM from: ${wasmPath}`);
    }

    // Dynamic import of WASM module
    const wasmModulePath = wasmPath.replace(/\.js$/, '');

    try {
      // For nodejs target, the module is already initialized on import
      // The WASM is loaded synchronously at module load time
      const imported = await import(wasmModulePath);

      // nodejs target exports functions directly
      wasmModule = imported;

      // Verify WASM module has required functions
      if (typeof wasmModule.parse_jsonl_wasm !== 'function') {
        throw new Error('WASM module missing parse_jsonl_wasm function');
      }

      isUsingFallback = false;
      loadTimeMs = Date.now() - startTime;

      if (debug) {
        const version = wasmModule.get_version?.() || 'unknown';
        console.log(`[claudecodehistory-wasm] WASM loaded successfully in ${loadTimeMs}ms, version: ${version}`);
      }
    } catch (wasmError) {
      if (!enableFallback) {
        throw wasmError;
      }

      if (debug) {
        console.warn('[claudecodehistory-wasm] WASM load failed, using TypeScript fallback:', wasmError);
      }

      isUsingFallback = true;
      initError = wasmError instanceof Error ? wasmError.message : 'Unknown WASM load error';
      loadTimeMs = Date.now() - startTime;
    }

    isInitialized = true;
    return getStatus();
  } catch (error) {
    if (!enableFallback) {
      throw error;
    }

    if (debug) {
      console.warn('[claudecodehistory-wasm] Initialization failed, using TypeScript fallback:', error);
    }

    isUsingFallback = true;
    isInitialized = true;
    initError = error instanceof Error ? error.message : 'Unknown initialization error';
    loadTimeMs = Date.now() - startTime;

    return getStatus();
  }
}

/**
 * Get the current module status
 */
export function getStatus(): WasmStatus {
  return {
    initialized: isInitialized,
    usingWasm: !isUsingFallback,
    usingFallback: isUsingFallback,
    version: PACKAGE_VERSION,
    loadTimeMs,
    error: initError,
  };
}

/**
 * Get the package version
 */
export function getVersion(): string {
  return PACKAGE_VERSION;
}

/**
 * Check if the module is using WASM (not fallback)
 */
export function isWasmEnabled(): boolean {
  return isInitialized && !isUsingFallback;
}

/**
 * Parse JSONL content string into conversation entries
 *
 * @param content - JSONL content string (one JSON object per line)
 * @param options - Parse options for filtering (not used in WASM, for API compatibility)
 * @returns Array of conversation entries
 */
export function parseJsonlContent(content: string, options: ParseOptions = {}): ConversationEntry[] {
  if (!isInitialized) {
    throw new Error('Module not initialized. Call init() first.');
  }

  if (isUsingFallback || !wasmModule) {
    return parseJsonlContentTS(content, options);
  }

  try {
    // nodejs target: parse_jsonl_wasm returns array directly (no JSON serialization needed)
    const result = wasmModule.parse_jsonl_wasm(content);
    return result as ConversationEntry[];
  } catch (error) {
    // Fallback to TypeScript on WASM error
    console.warn('[claudecodehistory-wasm] WASM parse failed, using fallback:', error);
    return parseJsonlContentTS(content, options);
  }
}

/**
 * Parse JSONL content with detailed results including errors
 *
 * @param content - JSONL content string
 * @param options - Parse options (not used in WASM, for API compatibility)
 * @returns Detailed parse result with entries, errors, and stats
 */
export function parseJsonlContentDetailed(
  content: string,
  options: ParseOptions = {}
): BatchParseResult {
  if (!isInitialized) {
    throw new Error('Module not initialized. Call init() first.');
  }

  if (isUsingFallback || !wasmModule) {
    return parseJsonlContentDetailedTS(content, options);
  }

  try {
    // nodejs target: parse_jsonl_with_metadata returns object directly
    const result = wasmModule.parse_jsonl_with_metadata(content, '');
    // Convert to BatchParseResult format
    return {
      entries: result.entries || result,
      errors: result.errors || [],
      stats: {
        totalLines: (result.entries || result).length,
        parsedLines: (result.entries || result).length,
        parseTimeMs: 0,
      },
    } as unknown as BatchParseResult;
  } catch (error) {
    console.warn('[claudecodehistory-wasm] WASM detailed parse failed, using fallback:', error);
    return parseJsonlContentDetailedTS(content, options);
  }
}

/**
 * Parse a JSONL file from disk
 *
 * @param filePath - Path to the JSONL file
 * @param options - Parse options
 * @returns Array of conversation entries
 */
export async function parseJsonlFile(
  filePath: string,
  options: ParseOptions = {}
): Promise<ConversationEntry[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseJsonlContent(content, options);
}

/**
 * Parse a JSONL file with detailed results
 *
 * @param filePath - Path to the JSONL file
 * @param options - Parse options
 * @returns Detailed parse result
 */
export async function parseJsonlFileDetailed(
  filePath: string,
  options: ParseOptions = {}
): Promise<BatchParseResult> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseJsonlContentDetailed(content, options);
}

/**
 * Search entries by query string
 *
 * @param entries - Array of conversation entries to search
 * @param query - Search query string (or SearchOptions object)
 * @returns Array of search results with match information
 */
export function searchEntries(
  entries: ConversationEntry[],
  query: string | SearchOptions
): SearchResult[] {
  if (!isInitialized) {
    throw new Error('Module not initialized. Call init() first.');
  }

  const options: SearchOptions = typeof query === 'string' ? { query } : query;

  if (isUsingFallback || !wasmModule) {
    return searchEntriesTS(entries, options);
  }

  try {
    // nodejs target: search_entries_detailed_wasm returns array directly
    const results = wasmModule.search_entries_detailed_wasm(entries, options.query, {
      case_sensitive: options.caseSensitive || false,
      include_tools: options.includeTools || true,
      limit: options.limit || 100,
    });
    // Convert to SearchResult format
    return results.map((entry: any) => ({
      entry,
      matches: [{ field: 'content', value: options.query, context: '' }],
      score: 1,
    })) as SearchResult[];
  } catch (error) {
    console.warn('[claudecodehistory-wasm] WASM search failed, using fallback:', error);
    return searchEntriesTS(entries, options);
  }
}

/**
 * Quick search that returns only matching entries (simpler API)
 *
 * @param entries - Array of conversation entries
 * @param query - Search query string
 * @returns Array of matching entries
 */
export function quickSearch(
  entries: ConversationEntry[],
  query: string
): ConversationEntry[] {
  const results = searchEntries(entries, { query, limit: 1000 });
  return results.map((r) => r.entry);
}

/**
 * Validate a single JSONL line
 *
 * @param line - A single line from a JSONL file
 * @returns Validation result with error message if invalid
 */
export function validateJsonlLine(line: string): { valid: boolean; error?: string } {
  return validateJsonlLineTS(line);
}

/**
 * Extract content from a Claude Code message
 *
 * @param message - Raw message from JSONL file
 * @returns Extracted content string
 */
export function extractContent(message: ClaudeCodeMessage): string {
  return extractContentTS(message);
}

// Re-export types
export type {
  ClaudeCodeMessage,
  ConversationEntry,
  BatchParseResult,
  ParseError,
  ParseOptions,
  SearchOptions,
  SearchResult,
  SearchMatch,
  WasmInitOptions,
  WasmStatus,
  EntryMetadata,
  MessageContent,
  UsageInfo,
} from '../types/index.js';

// Export fallback functions for direct use if needed
export {
  parseJsonlContentTS,
  parseJsonlContentDetailedTS,
  searchEntriesTS,
  validateJsonlLineTS,
  extractContentTS,
} from './ts-fallback.js';

// Default export with all functions
export default {
  init,
  getStatus,
  getVersion,
  isWasmEnabled,
  parseJsonlContent,
  parseJsonlContentDetailed,
  parseJsonlFile,
  parseJsonlFileDetailed,
  searchEntries,
  quickSearch,
  validateJsonlLine,
  extractContent,
};
