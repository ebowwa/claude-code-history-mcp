/**
 * Benchmark: Rust FFI vs TypeScript for Claude Code History
 *
 * Compares performance of:
 * 1. @ebowwa/claudecodehistory-rust (Rust FFI)
 * 2. @ebowwa/claudecodehistory (TypeScript)
 */

import { homedir } from "os";
import { join } from "path";
import { readdirSync, existsSync, readFileSync } from "fs";

// Test data setup
const CLAUDE_DIR = join(homedir(), ".claude");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

interface BenchmarkResult {
  name: string;
  ops: number;
  avgMs: number;
  minMs: number;
  maxMs: number;
  totalMs: number;
}

function formatNumber(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

async function benchmark(
  name: string,
  fn: () => Promise<unknown> | unknown,
  iterations: number = 100
): Promise<BenchmarkResult> {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 5; i++) {
    await fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalMs = times.reduce((a, b) => a + b, 0);
  const avgMs = totalMs / iterations;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);
  const ops = (iterations / totalMs) * 1000;

  return { name, ops, avgMs, minMs, maxMs, totalMs };
}

function printResults(results: BenchmarkResult[]) {
  console.log("\n" + "=".repeat(80));
  console.log("BENCHMARK RESULTS");
  console.log("=".repeat(80));
  console.log(
    "Name".padEnd(50) +
      "Avg (ms)".padStart(12) +
      "Min (ms)".padStart(12) +
      "Max (ms)".padStart(12) +
      "Ops/s".padStart(12)
  );
  console.log("-".repeat(98));

  for (const r of results) {
    console.log(
      r.name.padEnd(50) +
        formatNumber(r.avgMs).padStart(12) +
        formatNumber(r.minMs).padStart(12) +
        formatNumber(r.maxMs).padStart(12) +
        formatNumber(r.ops).padStart(12)
    );
  }

  // Calculate speedup if we have both implementations
  if (results.length >= 2) {
    const baseline = results[0].avgMs;
    console.log("\n" + "-".repeat(80));
    console.log("SPEEDUP ANALYSIS (vs TypeScript baseline)");
    console.log("-".repeat(80));
    for (let i = 1; i < results.length; i++) {
      const speedup = baseline / results[i].avgMs;
      const faster = speedup > 1;
      console.log(
        `${results[i].name}: ${faster ? "🚀" : "🐢"} ${formatNumber(Math.abs(speedup))}x ${faster ? "faster" : "slower"}`
      );
    }
  }
  console.log("=".repeat(80) + "\n");
}

// Find test files
function findHistoryFiles(): string[] {
  const files: string[] = [];
  if (!existsSync(PROJECTS_DIR)) return files;

  const projects = readdirSync(PROJECTS_DIR, { withFileTypes: true });
  for (const project of projects) {
    if (!project.isDirectory()) continue;
    const projectPath = join(PROJECTS_DIR, project.name);
    const sessionFiles = readdirSync(projectPath).filter(
      (f) => f.endsWith(".jsonl") && f !== "history.jsonl"
    );
    for (const file of sessionFiles) {
      files.push(join(projectPath, file));
    }
  }
  return files.slice(0, 10); // Test with first 10 files
}

// TypeScript implementation (baseline)
function parseJsonlTypeScript(filePath: string): unknown[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.trim().split("\n");
  return lines.map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function searchTypeScript(entries: unknown[], query: string): unknown[] {
  const queryLower = query.toLowerCase();
  return entries.filter((entry: any) => {
    const content = entry?.message?.content;
    if (typeof content === "string") {
      return content.toLowerCase().includes(queryLower);
    }
    return false;
  });
}

// Batch parse TypeScript
function parseBatchTypeScript(paths: string[]): unknown[] {
  const all: unknown[] = [];
  for (const path of paths) {
    const entries = parseJsonlTypeScript(path);
    all.push(...entries);
  }
  return all;
}

async function main() {
  console.log("Claude Code History Benchmark: Rust FFI vs TypeScript");
  console.log("=".repeat(80));

  const testFiles = findHistoryFiles();
  console.log(`Found ${testFiles.length} history files for testing`);

  if (testFiles.length === 0) {
    console.log("No test files found. Creating synthetic test data...");

    // Create synthetic test data
    const syntheticData: unknown[] = [];
    for (let i = 0; i < 1000; i++) {
      syntheticData.push({
        type: "user",
        timestamp: Date.now() - i * 60000,
        message: {
          role: "user",
          content: `Test message ${i} with some search terms like function and module`,
        },
        cwd: "/test/project",
        sessionId: "test-session",
      });
    }

    // Test with synthetic data
    const results: BenchmarkResult[] = [];

    // TypeScript search
    results.push(
      await benchmark("TypeScript: Search (synthetic, 1000 entries)", () => {
        searchTypeScript(syntheticData, "function");
      }, 500)
    );

    printResults(results);
    return;
  }

  // Get test file content for fair comparison
  const testFilePath = testFiles[0];
  const results: BenchmarkResult[] = [];

  // 1. TypeScript JSONL parsing
  results.push(
    await benchmark("TypeScript: Parse JSONL file", () => {
      parseJsonlTypeScript(testFilePath);
    }, 100)
  );

  // 2. TypeScript batch parsing (all files)
  results.push(
    await benchmark(`TypeScript: Batch parse ${testFiles.length} files`, () => {
      parseBatchTypeScript(testFiles);
    }, 50)
  );

  // 3. Get entries for search test
  const entries = parseJsonlTypeScript(testFilePath);

  // 4. TypeScript search
  if (entries.length > 0) {
    results.push(
      await benchmark("TypeScript: Search entries", () => {
        searchTypeScript(entries, "function");
      }, 500)
    );
  }

  // Try to load Rust FFI and run same tests
  let rustAvailable = false;
  try {
    const rustLib = await import("./src/index.ts");

    if (rustLib.isNativeAvailable?.()) {
      rustAvailable = true;
      console.log("\n✅ Rust FFI library loaded successfully\n");

      // Rust parse JSONL
      results.push(
        await benchmark("Rust FFI: Parse JSONL file", () => {
          rustLib.parseJsonlFile(testFilePath);
        }, 100)
      );

      // Rust batch parse
      results.push(
        await benchmark(`Rust FFI: Batch parse ${testFiles.length} files`, () => {
          rustLib.parseJsonlBatch(testFiles);
        }, 50)
      );

      // Rust search
      if (entries.length > 0) {
        const rustEntries = rustLib.parseJsonlFile(testFilePath);
        results.push(
          await benchmark("Rust FFI: Search entries", () => {
            rustLib.searchEntries(rustEntries, "function");
          }, 500)
        );
      }
    }
  } catch (e) {
    console.log("\n⚠️  Rust FFI not available:", (e as Error).message);
    console.log("   Run 'bun run build' first to compile the native library\n");
  }

  printResults(results);

  if (!rustAvailable) {
    console.log("To test Rust FFI performance:");
    console.log("  cd packages/src/claudecodehistory-rust");
    console.log("  bun run build");
    console.log("  bun run benchmark.ts");
  }
}

main().catch(console.error);
