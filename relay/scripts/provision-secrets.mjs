import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { generateCredentials } from "./generate-credentials.mjs";

const relayRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerCli = resolve(relayRoot, "node_modules", "wrangler", "bin", "wrangler.js");

function putSecret(name, value) {
  return new Promise((resolveSecret, rejectSecret) => {
    const child = spawn(process.execPath, [wranglerCli, "secret", "put", name], {
      cwd: relayRoot,
      stdio: ["pipe", "inherit", "inherit"],
    });

    child.once("error", rejectSecret);
    child.once("exit", (code) => {
      if (code === 0) {
        resolveSecret();
      } else {
        rejectSecret(new Error(`Failed to upload ${name}.`));
      }
    });
    child.stdin.end(`${value}\n`);
  });
}

async function main() {
  const credentials = await generateCredentials();
  await putSecret("AUTH_CREDENTIALS", JSON.stringify(credentials));
  await putSecret("TOKEN_SECRET", randomBytes(32).toString("base64url"));
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
