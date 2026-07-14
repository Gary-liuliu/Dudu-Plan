import { pbkdf2, randomBytes } from "node:crypto";

const ITERATIONS = 210_000;
const accounts = [
  ["owner", "嘟嘟"],
  ["observer", "肚肚"],
];

function base64Url(buffer) {
  return buffer.toString("base64url");
}

function readHidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      reject(new Error("Run this command in an interactive terminal."));
      return;
    }

    process.stderr.write(prompt);
    process.stdin.setEncoding("utf8");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let value = "";

    function cleanup() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
    }

    function onData(character) {
      if (character === "\u0003") {
        cleanup();
        process.stderr.write("\n");
        reject(new Error("Cancelled."));
        return;
      }
      if (character === "\r" || character === "\n") {
        cleanup();
        process.stderr.write("\n");
        resolve(value);
        return;
      }
      if (character === "\u007f" || character === "\b") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          process.stderr.write("\b \b");
        }
        return;
      }
      value += character;
      process.stderr.write("*");
    }

    process.stdin.on("data", onData);
  });
}

function deriveHash(password, salt) {
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, ITERATIONS, 32, "sha256", (error, hash) => {
      if (error) {
        reject(error);
      } else {
        resolve(hash);
      }
    });
  });
}

async function createRecord(username) {
  const password = await readHidden(`${username} password: `);
  const confirmation = await readHidden(`${username} password again: `);
  if (!password || password !== confirmation) {
    throw new Error(`${username} passwords do not match.`);
  }
  const salt = randomBytes(16);
  return {
    username,
    salt: base64Url(salt),
    hash: base64Url(await deriveHash(password, salt)),
  };
}

async function main() {
  const records = {};
  for (const [role, username] of accounts) {
    records[role] = await createRecord(username);
  }
  const credentials = {
    version: 1,
    algorithm: "PBKDF2-SHA-256",
    iterations: ITERATIONS,
    accounts: records,
  };
  process.stdout.write(`${JSON.stringify(credentials)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
