# Deprecated Implementations

These implementations were benchmarked against the TypeScript version and found to be **slower or equal** for the Claude Code history workload.

## Benchmark Results (2026-02-22)

**Dataset:** 1GB, 2,761 files, 433,834 entries

| Implementation | Time | Throughput | Verdict |
|----------------|------|------------|---------|
| **TypeScript** | **4.64s** | **218 MB/s** | **WINNER** |
| Rust FFI | 16.68s | 60.67 MB/s | 3.59x slower |
| WASM | ~4.6s | ~218 MB/s | Same as TS |
| Bridge (msgpack) | - | - | Subprocess overhead |

## Why TypeScript Won

1. V8's native `JSON.parse` is extremely optimized
2. FFI/WASM call overhead negates any parsing gains
3. The workload is I/O bound, not CPU bound
4. For small files, FFI overhead dominates

## Implementations

### claudecodehistory-rust
- Rust FFI bindings for Bun
- Uses `bun:ffi` to call native Rust code
- **3.59x slower** than TypeScript due to FFI overhead

### claudecodehistory-wasm
- WebAssembly compilation of Rust parser
- Comparable performance to TypeScript
- No benefit over TypeScript, adds build complexity

### claudecodehistory-bridge
- Subprocess with MessagePack protocol
- Highest latency due to process spawning
- Useful only for long-running batch operations

## Future Use Cases

These might be useful if:
- Dataset size increases 10x+ (current: 1GB)
- CPU-bound operations are needed (search indexing, compression)
- Parallel processing across multiple cores
- Integration with non-Node environments
