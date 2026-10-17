const { spawn } = require("child_process");

const port = process.env.PORT || "3000";
const args = ["next", "start", "-p", port];

const child = spawn("pnpm", args, {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});

