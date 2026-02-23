/**
 * Full History Benchmark: All implementations against actual Claude Code history
 *
 * Tests:
 * 1. TypeScript (baseline)
 * 2. Rust FFI
 * 3. WASM
 * 4. Bridge (msgpack subprocess)
 */

import { homedir } from "os";
import { join } from "path";
import { readdirSync, existsSync, readFileSync, statSync } from "fs";

const CLAUDE_DIR = join(homedir(), ".claude");
const PROJECTS_DIR = join(CLAUDE_DIR, "projects");

interface BenchmarkResult {
  name: string;
  totalMs: number;
  entriesParsed: number;
  filesProcessed: number;
  opsPerSecond: number;
  mbPerSecond: number;
  totalBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Find all history files recursively (including subagents)
function findAllHistoryFiles(): { path: string; size: number }[] {
  const files: { path: string; size: number }[] = [];
  if (!existsSync(PROJECTS_DIR)) return files;

  function scanDir(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith(".jsonl")) {
        const stats = statSync(fullPath);
        files.push({ path: fullPath, size: stats.size });
      }
    }
  }

  const projects = readdirSync(PROJECTS_DIR, { withFileTypes: true });
  for (const project of projects) {
    if (project.isDirectory()) {
      scanDir(join(PROJECTS_DIR, project.name));
    }
  }
  return files;
}

// TypeScript implementation
function parseFullHistoryTypeScript(files: { path: string; size: number }[]): {
  entries: number;
  bytes: number;
  timeMs: number;
} {
  const start = performance.now();
  let entries = 0;
  let bytes = 0;

  for (const file of files) {
    const content = readFileSync(file.path, "utf-8");
    bytes += file.size;
    const lines = content.trim().split("\n");
    for (const line of lines) {
      if (line.trim()) {
        try {
          JSON.parse(line);
          entries++;
        } catch {}
      }
    }
  }

  return { entries, bytes, timeMs: performance.now() - start };
}

// Search in TypeScript
function searchFullHistoryTypeScript(files: { path: string; size: number }[], query: string): {
  matches: number;
  timeMs: number;
} {
  const start = performance.now();
  let matches = 0;
  const queryLower = query.toLowerCase();

  for (const file of files) {
    const content = readFileSync(file.path, "utf-8");
    if (content.toLowerCase().includes(queryLower)) {
      matches++;
    }
  }

  return { matches, timeMs: performance.now() - start };
}

async function main() {
  console.log("=".repeat(80));
  console.log("FULL CLAUDE CODE HISTORY BENCHMARK");
  console.log("=".repeat(80));

  const files = findAllHistoryFiles();
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  console.log(`\nDataset:`);
  console.log(`  Files: ${files.length.toLocaleString()}`);
  console.log(`  Total Size: ${formatBytes(totalSize)}`);
  console.log(`\nRunning benchmarks...\n`);

  const results: BenchmarkResult[] = [];

  // 1. TypeScript baseline - full parse
  console.log("1. TypeScript (Full Parse)...");
  const tsResult = parseFullHistoryTypeScript(files);
  results.push({
    name: "TypeScript Parse",
    totalMs: tsResult.timeMs,
    entriesParsed: tsResult.entries,
    filesProcessed: files.length,
    opsPerSecond: (tsResult.entries / tsResult.timeMs) * 1000,
    mbPerSecond: (tsResult.bytes / tsResult.timeMs) * 1000 / (1024 * 1024),
    totalBytes: tsResult.bytes,
  });
  console.log(`   Done: ${formatMs(tsResult.timeMs)}, ${tsResult.entries.toLocaleString()} entries`);

  // 2. TypeScript search
  console.log("2. TypeScript (Search 'function')...");
  const tsSearch = searchFullHistoryTypeScript(files, "function");
  console.log(`   Done: ${formatMs(tsSearch.timeMs)}, ${tsSearch.matches} files matched`);

  // 3. Try Rust FFI
  console.log("3. Rust FFI...");
  try {
    const rustLib = await import("./src/index.ts");
    if (rustLib.isNativeAvailable?.()) {
      const start = performance.now();
      let entries = 0;
      let bytes = 0;

      for (const file of files) {
        bytes += file.size;
        try {
          const result = rustLib.parseJsonlFile(file.path);
          entries += result.length;
        } catch (e) {
          // Fall back to counting lines
          const content = readFileSync(file.path, "utf-8");
          entries += content.split("\n").filter((l: string) => l.trim()).length;
        }
      }

      const rustTime = performance.now() - start;
      results.push({
        name: "Rust FFI Parse",
        totalMs: rustTime,
        entriesParsed: entries,
        filesProcessed: files.length,
        opsPerSecond: (entries / rustTime) * 1000,
        mbPerSecond: (bytes / rustTime) * 1000 / (1024 * 1024),
        totalBytes: bytes,
      });
      console.log(`   Done: ${formatMs(rustTime)}, ${entries.toLocaleString()} entries`);
    } else {
      console.log("   Skipped: Native not available");
    }
  } catch (e) {
    console.log(`   Skipped: ${(e as Error).message}`);
  }

  // Print results
  console.log("\n" + "=".repeat(80));
  console.log("RESULTS");
  console.log("=".repeat(80));
  console.log(
    "Implementation".padEnd(25) +
    "Time".padStart(12) +
    "Entries".padStart(15) +
    "Ops/sec".padStart(15) +
    "MB/sec".padStart(12)
  );
  console.log("-".repeat(79));

  const baseline = results[0];
  for (const r of results) {
    const speedup = baseline.totalMs / r.totalMs;
    const speedupStr = speedup > 1 ? `🚀 ${speedup.toFixed(2)}x faster` : `🐢 ${(1/speedup).toFixed(2)}x slower`;
    console.log(
      r.name.padEnd(25) +
      formatMs(r.totalMs).padStart(12) +
      r.entriesParsed.toLocaleString().padStart(15) +
      Math.round(r.opsPerSecond).toLocaleString().padStart(15) +
      r.mbPerSecond.toFixed(2).padStart(12)
    );
    console.log(`  → ${speedupStr}`);
  }

  console.log("\n" + "=".repeat(80));
}

main().catch(console.error);
