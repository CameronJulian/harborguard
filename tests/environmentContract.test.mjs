import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();

const envExample =
  fs.readFileSync(
    path.join(root, ".env.example"),
    "utf8"
  );

const sourceRoots = [
  "app",
  "components",
  "lib",
  "tools",
  "instrumentation.ts",
  "next.config.ts",
];

const runtimeManaged = new Set([
  "CI",
  "NEXT_RUNTIME",
  "NODE_ENV",
  "VERCEL_ENV",
]);

function collectFiles(entry) {
  const absolute =
    path.join(root, entry);

  if (!fs.existsSync(absolute)) {
    return [];
  }

  const stat =
    fs.statSync(absolute);

  if (stat.isFile()) {
    return [absolute];
  }

  const files = [];

  for (
    const name of
      fs.readdirSync(absolute)
  ) {
    const child =
      path.join(absolute, name);

    const childStat =
      fs.statSync(child);

    if (childStat.isDirectory()) {
      files.push(
        ...collectFiles(
          path.relative(
            root,
            child
          )
        )
      );
      continue;
    }

    if (
      /\.(ts|tsx|js|mjs|cjs)$/.test(
        child
      )
    ) {
      files.push(child);
    }
  }

  return files;
}

function extractSourceEnvNames() {
  const names =
    new Set();

  for (const sourceRoot of sourceRoots) {
    for (
      const file of
      collectFiles(sourceRoot)
    ) {
      const text =
        fs.readFileSync(
          file,
          "utf8"
        );

      for (
        const match of
        text.matchAll(
          /process\.env\.([A-Z0-9_]+)/g
        )
      ) {
        names.add(match[1]);
      }
    }
  }

  return names;
}

function extractExampleNames() {
  const names =
    new Set();

  for (
    const line of
    envExample.split(/\r?\n/)
  ) {
    const match =
      line.match(
        /^([A-Z0-9_]+)=/
      );

    if (match) {
      names.add(match[1]);
    }
  }

  return names;
}

test(
  ".env.example covers all source environment variables except runtime-managed ones",
  () => {
    const sourceNames =
      extractSourceEnvNames();

    const exampleNames =
      extractExampleNames();

    const missing = [
      ...sourceNames,
    ]
      .filter(
        (name) =>
          !runtimeManaged.has(name)
      )
      .filter(
        (name) =>
          !exampleNames.has(name)
      )
      .sort();

    assert.deepEqual(
      missing,
      []
    );
  }
);

test(
  ".env.example does not define unknown active variables",
  () => {
    const sourceNames =
      extractSourceEnvNames();

    const exampleNames =
      extractExampleNames();

    const unknown = [
      ...exampleNames,
    ]
      .filter(
        (name) =>
          !sourceNames.has(name)
      )
      .sort();

    assert.deepEqual(
      unknown,
      []
    );
  }
);

test(
  "server secrets remain empty in .env.example",
  () => {
    const secretNames = [
      "CRON_SECRET",
      "GOOGLE_ROUTES_API_KEY",
      "HERE_API_KEY",
      "HARBORGUARD_HSPP_WORKER_CRON_SECRET",
      "HARBORGUARD_LOAD_ACCESS_TOKEN",
      "HARBORGUARD_SOAK_ACCESS_TOKEN",
      "OPENAI_API_KEY",
      "ORS_API_KEY",
      "PAYFAST_MERCHANT_KEY",
      "PAYFAST_PASSPHRASE",
      "RESEND_API_KEY",
      "SAMSARA_API_TOKEN",
      "SUPABASE_SERVICE_ROLE_KEY",
      "TOMTOM_API_KEY",
      "TRACCAR_API_TOKEN",
      "TWILIO_AUTH_TOKEN",
      "UPSTASH_REDIS_REST_TOKEN",
      "VAPID_PRIVATE_KEY",
    ];

    for (const name of secretNames) {
      assert.match(
        envExample,
        new RegExp(
          `^${name}=$`,
          "m"
        )
      );
    }
  }
);

test(
  "public Supabase configuration is documented",
  () => {
    assert.match(
      envExample,
      /^NEXT_PUBLIC_SUPABASE_URL=/m
    );

    assert.match(
      envExample,
      /^NEXT_PUBLIC_SUPABASE_ANON_KEY=/m
    );
  }
);

test(
  "service-role credential is marked server-only",
  () => {
    assert.match(
      envExample,
      /SERVER ONLY[\s\S]*SUPABASE_SERVICE_ROLE_KEY=/
    );
  }
);
