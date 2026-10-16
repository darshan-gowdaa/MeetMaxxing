const { execSync } = require('child_process');

console.log("\n==========================================");
console.log("[*] Starting MeetMaxxing Servers");
console.log("==========================================\n");
console.log("[i] Tip: If ports are stuck, run 'npm run kill'\n");

try {
  execSync('npx concurrently --kill-others --prefix-colors "blue,green" --names "Backend,Frontend" "npm run start:backend" "npm run start:frontend"', { stdio: 'inherit' });
} catch (e) {
  console.error("\n[ERROR] Servers stopped unexpectedly. Check logs above.");
  process.exit(1);
}
