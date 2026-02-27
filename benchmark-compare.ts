/**
 * Benchmark: TypeScript vs Rust Implementation
 *
 * Compares performance between:
 * - TypeScript with @ebowwa/jsonl-hft
 * - Rust native implementation via napi-rs
 *
 * Run with: bun run benchmark-compare.ts
 */

import { ClaudeCodeHistoryService as TsService } from './typescript/src/history-service.js';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// Types
interface BenchmarkResult {
  name: string;
  implementation: 'typescript' | 'rust';
  iterations: number;
  totalTimeMs: number;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  opsPerSecond: number;
}

interface ComparisonResult {
  operation: string;
  typescript: BenchmarkResult;
  rust: BenchmarkResult | null;
  speedup: number | null;
}

// Helper to measure execution time
async function measure<T>(
  name: string,
  fn: () => Promise<T>,
  iterations: number = 10
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup
  await fn();

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTimeMs = times.reduce((a, b) => a + b, 0);
  const avgTimeMs = totalTimeMs / iterations;
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);
  const opsPerSecond = 1000 / avgTimeMs;

  return {
    name,
    implementation: 'typescript',
    iterations,
    totalTimeMs,
    avgTimeMs,
    minTimeMs,
    maxTimeMs,
    opsPerSecond,
  };
}

// Format milliseconds
function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}µs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Format comparison
function formatComparison(ts: BenchmarkResult, rust: BenchmarkResult | null): string {
  if (!rust) {
    return `TypeScript: ${formatMs(ts.avgTimeMs)} (Rust not available)`;
  }

  const speedup = ts.avgTimeMs / rust.avgTimeMs;
  const faster = speedup > 1 ? 'Rust' : 'TypeScript';
  const factor = speedup > 1 ? speedup : 1 / speedup;

  return [
    `TypeScript: ${formatMs(ts.avgTimeMs)}`,
    `Rust:       ${formatMs(rust.avgTimeMs)}`,
    `Winner:     ${faster} is ${factor.toFixed(2)}x faster`,
  ].join('\n');
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  Claude Code History - TypeScript vs Rust Benchmark');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Detect available implementations
  let RustService: any = null;
  try {
    const rustModule = await import('./rust/index.js');
    RustService = rustModule.ClaudeCodeHistoryService;
    console.log('✓ Rust implementation available');
  } catch {
    console.log('✗ Rust implementation not available (using fallback)');
  }

  console.log('✓ TypeScript implementation available');
  console.log('');

  const claudeDir = path.join(os.homedir(), '.claude');
  const tsService = new TsService(claudeDir);
  const rustService = RustService ? new RustService(claudeDir) : null;

  const results: ComparisonResult[] = [];

  // Benchmark 1: List Projects
  console.log('Benchmark 1: listProjects()');
  console.log('─────────────────────────────────────────────────────────────────────');

  const tsListProjects = await measure(
    'listProjects',
    () => tsService.listProjects(),
    20
  );

  let rustListProjects: BenchmarkResult | null = null;
  if (rustService) {
    rustListProjects = await measure(
      'listProjects',
      () => rustService.listProjects(),
      20
    );
    rustListProjects.implementation = 'rust';
  }

  console.log(formatComparison(tsListProjects, rustListProjects));
  console.log('');

  results.push({
    operation: 'listProjects',
    typescript: tsListProjects,
    rust: rustListProjects,
    speedup: rustListProjects ? tsListProjects.avgTimeMs / rustListProjects.avgTimeMs : null,
  });

  // Benchmark 2: List Sessions
  console.log('Benchmark 2: listSessions()');
  console.log('─────────────────────────────────────────────────────────────────────');

  const tsListSessions = await measure(
    'listSessions',
    () => tsService.listSessions({}),
    5
  );

  let rustListSessions: BenchmarkResult | null = null;
  if (rustService) {
    rustListSessions = await measure(
      'listSessions',
      () => rustService.listSessions({}),
      5
    );
    rustListSessions.implementation = 'rust';
  }

  console.log(formatComparison(tsListSessions, rustListSessions));
  console.log('');

  results.push({
    operation: 'listSessions',
    typescript: tsListSessions,
    rust: rustListSessions,
    speedup: rustListSessions ? tsListSessions.avgTimeMs / rustListSessions.avgTimeMs : null,
  });

  // Benchmark 3: Get Conversation History (paginated)
  console.log('Benchmark 3: getConversationHistory({ limit: 100 })');
  console.log('─────────────────────────────────────────────────────────────────────');

  const tsGetHistory = await measure(
    'getConversationHistory',
    () => tsService.getConversationHistory({ limit: 100, messageTypes: ['user', 'assistant'] }),
    10
  );

  let rustGetHistory: BenchmarkResult | null = null;
  if (rustService) {
    rustGetHistory = await measure(
      'getConversationHistory',
      () => rustService.getConversationHistory({ limit: 100, messageTypes: ['user', 'assistant'] }),
      10
    );
    rustGetHistory.implementation = 'rust';
  }

  console.log(formatComparison(tsGetHistory, rustGetHistory));
  console.log('');

  results.push({
    operation: 'getConversationHistory',
    typescript: tsGetHistory,
    rust: rustGetHistory,
    speedup: rustGetHistory ? tsGetHistory.avgTimeMs / rustGetHistory.avgTimeMs : null,
  });

  // Benchmark 4: Search Conversations
  console.log('Benchmark 4: searchConversations("error")');
  console.log('─────────────────────────────────────────────────────────────────────');

  const tsSearch = await measure(
    'searchConversations',
    () => tsService.searchConversations('error', { limit: 50 }),
    10
  );

  let rustSearch: BenchmarkResult | null = null;
  if (rustService) {
    rustSearch = await measure(
      'searchConversations',
      () => rustService.searchConversations('error', { limit: 50 }),
      10
    );
    rustSearch.implementation = 'rust';
  }

  console.log(formatComparison(tsSearch, rustSearch));
  console.log('');

  results.push({
    operation: 'searchConversations',
    typescript: tsSearch,
    rust: rustSearch,
    speedup: rustSearch ? tsSearch.avgTimeMs / rustSearch.avgTimeMs : null,
  });

  // Benchmark 5: Get Recent Activity
  console.log('Benchmark 5: getRecentActivity({ limit: 20 })');
  console.log('─────────────────────────────────────────────────────────────────────');

  const tsRecentActivity = await measure(
    'getRecentActivity',
    () => tsService.getRecentActivity({ limit: 20, includeSummaries: true }),
    5
  );

  let rustRecentActivity: BenchmarkResult | null = null;
  if (rustService) {
    rustRecentActivity = await measure(
      'getRecentActivity',
      () => rustService.getRecentActivity({ limit: 20, includeSummaries: true }),
      5
    );
    rustRecentActivity.implementation = 'rust';
  }

  console.log(formatComparison(tsRecentActivity, rustRecentActivity));
  console.log('');

  results.push({
    operation: 'getRecentActivity',
    typescript: tsRecentActivity,
    rust: rustRecentActivity,
    speedup: rustRecentActivity ? tsRecentActivity.avgTimeMs / rustRecentActivity.avgTimeMs : null,
  });

  // Summary
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('| Operation            | TypeScript    | Rust          | Speedup   |');
  console.log('|----------------------|---------------|---------------|-----------|');

  for (const result of results) {
    const ts = formatMs(result.typescript.avgTimeMs).padEnd(13);
    const rs = result.rust ? formatMs(result.rust.avgTimeMs).padEnd(13) : 'N/A'.padEnd(13);
    const speedup = result.speedup ? `${result.speedup.toFixed(2)}x` : 'N/A';

    console.log(`| ${result.operation.padEnd(20)} | ${ts}| ${rs}| ${speedup.padEnd(9)}|`);
  }

  console.log('');

  // Calculate overall speedup
  const speedups = results
    .filter(r => r.speedup !== null)
    .map(r => r.speedup!);

  if (speedups.length > 0) {
    const avgSpeedup = speedups.reduce((a, b) => a + b, 0) / speedups.length;
    console.log(`Average Speedup: ${avgSpeedup.toFixed(2)}x`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════');
}

// Run benchmarks
main().catch(console.error);
