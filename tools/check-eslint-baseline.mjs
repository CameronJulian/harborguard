import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

const baselinePath =
  path.join(
    root,
    "eslint-baseline.json"
  );

function classify(relative) {
  if (
    /^(?:_archive|_audit-backups)(?:\/|$)/.test(
      relative
    )
  ) {
    return "EXCLUDED_ARCHIVE";
  }

  if (
    /(?:^|\/)page\.before-[^/]*\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(
      relative
    )
  ) {
    return "EXCLUDED_HISTORICAL";
  }

  if (
    /(?:^|\/)[^/]*-before-[^/]*\.(?:ts|tsx|js|jsx|mjs|cjs)$/i.test(
      relative
    )
  ) {
    return "EXCLUDED_HISTORICAL";
  }

  if (/^tests\//.test(relative)) {
    return "TEST";
  }

  if (
    /^(?:app|lib|components)(?:\/|$)/.test(
      relative
    )
  ) {
    return "PRODUCTION";
  }

  if (
    /^(?:middleware|instrumentation)(?:\.|\/|$)/.test(
      relative
    )
  ) {
    return "PRODUCTION";
  }

  if (/^tools\//.test(relative)) {
    return "TOOLING";
  }

  return "OTHER";
}

function keyOf(entry) {
  return [
    entry.category,
    entry.file,
    entry.rule,
  ].join("|");
}

const baseline =
  JSON.parse(
    fs.readFileSync(
      baselinePath,
      "utf8"
    )
  );

const eslintCli =
  path.join(
    root,
    "node_modules",
    "eslint",
    "bin",
    "eslint.js"
  );

if (!fs.existsSync(eslintCli)) {
  console.error(
    "Local ESLint CLI is missing. Run npm ci or npm install first."
  );
  process.exit(2);
}

const run =
  spawnSync(
    process.execPath,
    [
      eslintCli,
      ".",
      "--format",
      "json",
    ],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer:
        64 * 1024 * 1024,
      shell: false,
    }
  );
if (run.error) {
  console.error(
    "Unable to execute ESLint:",
    run.error
  );
  process.exit(2);
}

/*
 * ESLint exit code 1 is expected while the repository
 * contains baselined lint debt. Exit >= 2 represents an
 * ESLint/config/runtime failure rather than lint findings.
 */
if (
  typeof run.status === "number" &&
  run.status >= 2
) {
  process.stderr.write(
    run.stderr ?? ""
  );

  console.error(
    `ESLint failed with exit code ${run.status}`
  );

  process.exit(2);
}

let report;

try {
  report =
    JSON.parse(
      run.stdout
    );
}
catch (error) {
  console.error(
    "Unable to parse ESLint JSON output:",
    error
  );

  process.exit(2);
}

const current = [];

for (const result of report) {
  const relative =
    path
      .relative(
        root,
        result.filePath
      )
      .replaceAll("\\", "/");

  const category =
    classify(relative);

  if (
    ![
      "PRODUCTION",
      "TEST",
      "TOOLING",
    ].includes(category)
  ) {
    continue;
  }

  const groups =
    new Map();

  for (const message of result.messages) {
    const rule =
      message.ruleId ??
      "PARSER_OR_CONFIG";

    if (!groups.has(rule)) {
      groups.set(
        rule,
        {
          errors: 0,
          warnings: 0,
        }
      );
    }

    const counts =
      groups.get(rule);

    if (message.severity === 2) {
      counts.errors += 1;
    }
    else if (message.severity === 1) {
      counts.warnings += 1;
    }
  }

  for (
    const [rule, counts] of
    groups.entries()
  ) {
    if (
      counts.errors === 0 &&
      counts.warnings === 0
    ) {
      continue;
    }

    current.push({
      file: relative,
      category,
      rule,
      errors: counts.errors,
      warnings: counts.warnings,
    });
  }
}

current.sort(
  (a, b) =>
    a.category.localeCompare(
      b.category
    ) ||
    a.file.localeCompare(
      b.file
    ) ||
    a.rule.localeCompare(
      b.rule
    )
);

const baselineMap =
  new Map(
    baseline.map(
      (entry) => [
        keyOf(entry),
        entry,
      ]
    )
  );

const regressions = [];

for (const entry of current) {
  const key =
    keyOf(entry);

  const previous =
    baselineMap.get(key);

  if (!previous) {
    regressions.push({
      type: "new-violation",
      key,
      beforeErrors: 0,
      currentErrors:
        entry.errors,
      beforeWarnings: 0,
      currentWarnings:
        entry.warnings,
    });

    continue;
  }

  if (
    entry.errors >
      previous.errors ||
    entry.warnings >
      previous.warnings
  ) {
    regressions.push({
      type: "increased-debt",
      key,
      beforeErrors:
        previous.errors,
      currentErrors:
        entry.errors,
      beforeWarnings:
        previous.warnings,
      currentWarnings:
        entry.warnings,
    });
  }
}

if (regressions.length > 0) {
  console.error(
    ""
  );

  console.error(
    "ESLint baseline regression detected."
  );

  for (
    const regression of
    regressions
  ) {
    console.error(
      [
        regression.type,
        regression.key,
        `errors ${regression.beforeErrors}->${regression.currentErrors}`,
        `warnings ${regression.beforeWarnings}->${regression.currentWarnings}`,
      ].join(" | ")
    );
  }

  console.error(
    ""
  );

  console.error(
    "Existing lint debt may stay equal or decrease, but it may not increase."
  );

  process.exit(1);
}

const baselineErrors =
  baseline.reduce(
    (total, entry) =>
      total + entry.errors,
    0
  );

const currentErrors =
  current.reduce(
    (total, entry) =>
      total + entry.errors,
    0
  );

const baselineWarnings =
  baseline.reduce(
    (total, entry) =>
      total + entry.warnings,
    0
  );

const currentWarnings =
  current.reduce(
    (total, entry) =>
      total + entry.warnings,
    0
  );

console.log(
  "ESLint incremental baseline PASS"
);

console.log(
  `baseline entries: ${baseline.length}`
);

console.log(
  `current entries: ${current.length}`
);

console.log(
  `errors: ${baselineErrors} -> ${currentErrors}`
);

console.log(
  `warnings: ${baselineWarnings} -> ${currentWarnings}`
);

console.log(
  "New violations: 0"
);

console.log(
  "Existing violation increases: 0"
);
