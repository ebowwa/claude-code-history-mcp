import { ClaudeCodeHistoryClient } from "./src/msgpack-client.js";

async function main() {
  console.log("Creating client...");
  const client = new ClaudeCodeHistoryClient({ debug: true });
  
  console.log("Starting client...");
  await client.start();
  console.log("Client started, PID:", client.getStatus().pid);

  console.log("Sending info request...");
  try {
    const info = await client.info();
    console.log("Info:", info);
  } catch (e) {
    console.error("Info error:", e);
  }

  console.log("Sending parse request...");
  const testContent = `{"session_id":"test","role":"user","content":"hello","timestamp":"2024-01-01T00:00:00Z"}
{"session_id":"test","role":"assistant","content":"hi","timestamp":"2024-01-01T00:00:01Z"}`;
  
  try {
    const result = await client.parseContent(testContent);
    console.log("Parse result:", result);
  } catch (e) {
    console.error("Parse error:", e);
  }

  await client.shutdown();
}

main().catch(console.error);
