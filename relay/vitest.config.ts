import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

const testCredentials = JSON.stringify({
  version: 1,
  algorithm: "PBKDF2-SHA-256",
  iterations: 100_000,
  accounts: {
    owner: {
      username: "嘟嘟",
      salt: "dGVzdC1vd25lci1zYWx0",
      hash: "zd-xRRQwRosjTP4wwsKaC8utbvZH7iQ7aQbErDGpoZY",
    },
    observer: {
      username: "肚肚",
      salt: "dGVzdC1vYnNlcnZlci1zYWx0",
      hash: "qi773Ga2XMTOfaoSYboGDe5G2cUy7B5A6FZVOL-BScc",
    },
  },
});

export default defineConfig({
  plugins: [
    cloudflareTest({
      miniflare: {
        bindings: {
          AUTH_CREDENTIALS: testCredentials,
          TOKEN_SECRET: "test-token-secret-with-at-least-32-characters",
        },
      },
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
});
