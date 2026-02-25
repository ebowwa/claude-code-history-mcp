const { existsSync, mkdirSync, copyFileSync, readdirSync } = require('fs');
const { join } = require('path');

const platform = process.platform;
const arch = process.arch;
const nativeDir = join(__dirname, '..', 'native', `${platform}-${arch}`);

if (!existsSync(nativeDir)) {
  mkdirSync(nativeDir, { recursive: true });
}

// Copy from target/release if available
const libName = platform === 'darwin' 
  ? 'libclaudecodehistory_rust.dylib'
  : platform === 'linux' 
    ? 'libclaudecodehistory_rust.so'
    : 'claudecodehistory_rust.dll';

const releasePath = join(__dirname, '..', 'target', 'release', libName);
const destPath = join(nativeDir, libName);

if (existsSync(releasePath)) {
  copyFileSync(releasePath, destPath);
  console.log(`Copied native binary to ${nativeDir}`);
} else {
  console.log(`Native binary not found at ${releasePath}. Run 'cargo build --release' first.`);
}
