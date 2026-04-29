const { spawn } = require("child_process");
const path = require("path");

const child = spawn(process.execPath, [
  path.join(__dirname, "node_modules", "tsx", "dist", "cli.mjs"),
  path.join(__dirname, "src", "scripts", "scheduler.ts")
], { stdio: "inherit", cwd: __dirname });

child.on("exit", (code) => process.exit(code || 0));
