const { execSync } = require('child_process');

console.log("\n==========================================");
console.log("[*] Setting up MeetMaxxing Dependencies");
console.log("==========================================\n");

console.log("[+] Installing Frontend Dependencies...");
try {
  execSync('cd frontend && npm install', { stdio: 'inherit' });
  console.log("[OK] Frontend setup complete.\n");
} catch (e) {
  console.error("[ERROR] Error setting up frontend. Check npm logs.");
  process.exit(1);
}

console.log("[+] Installing Backend Dependencies...");
try {
  execSync('cd backend && uv sync', { stdio: 'inherit' });
  console.log("[OK] Backend setup complete.\n");
} catch (e) {
  console.error("[ERROR] Error setting up backend. Ensure uv is installed.");
  process.exit(1);
}

console.log("[DONE] All dependencies installed! Run 'npm start' to begin.\n");
