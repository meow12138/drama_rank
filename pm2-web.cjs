const { spawn } = require("child_process");
const path = require("path");

const child = spawn(process.execPath, [
  path.join(__dirname, "node_modules", "next", "dist", "bin", "next"),
  "start"
], { stdio: "inherit", cwd: __dirname });

child.on("exit", (code) => process.exit(code || 0));
