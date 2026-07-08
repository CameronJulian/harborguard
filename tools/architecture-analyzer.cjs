const fs = require("fs");
const path = require("path");

const root = process.cwd();
const ignore = ["node_modules", ".next", ".git", ".vercel", "dist", "build"];

function walk(dir) {
  let results = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignore.includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) results = results.concat(walk(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(item.name)) results.push(full);
  }
  return results;
}

function rel(file) {
  return file.replace(root, "").replace(/\\/g, "/");
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function routeFromPage(file) {
  let route = rel(file)
    .replace(/^\/app/, "")
    .replace(/\/page\.(tsx|ts|jsx|js)$/, "")
    .replace(/\/index$/, "");

  return route || "/";
}

function routeFromApi(file) {
  return rel(file)
    .replace(/^\/app\/api/, "/api")
    .replace(/\/route\.(tsx|ts|jsx|js)$/, "");
}

function unique(arr) {
  return [...new Set(arr)].sort();
}

const files = walk(root);

const pages = files
  .filter(f => /\/app\/.*\/page\.(tsx|ts|jsx|js)$|\\app\\.*\\page\.(tsx|ts|jsx|js)$/.test(f))
  .map(file => {
    const content = read(file);
    return {
      route: routeFromPage(file),
      file: rel(file),
      imports: unique([...content.matchAll(/import\s+(.+?)\s+from\s+["'](.+?)["']/gs)].map(m => `${m[1].trim()} from ${m[2].trim()}`)),
      apiCalls: unique([...content.matchAll(/["'`]((?:\/api\/)[^"'` )]+)/g)].map(m => m[1])),
      functions: unique([...content.matchAll(/(?:export\s+default\s+function|export\s+async\s+function|export\s+function|async\s+function|function)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]))
    };
  })
  .sort((a, b) => a.route.localeCompare(b.route));

const apis = files
  .filter(f => /\/app\/api\/.*\/route\.(ts|js)$|\\app\\api\\.*\\route\.(ts|js)$/.test(f))
  .map(file => {
    const content = read(file);
    return {
      route: routeFromApi(file),
      file: rel(file),
      methods: unique([...content.matchAll(/export\s+async\s+function\s+(GET|POST|PATCH|DELETE|PUT)/g)].map(m => m[1])),
      supabaseTables: unique([...content.matchAll(/\.from\(["'`]([^"'`]+)["'`]\)/g)].map(m => m[1])),
      imports: unique([...content.matchAll(/import\s+(.+?)\s+from\s+["'](.+?)["']/gs)].map(m => `${m[1].trim()} from ${m[2].trim()}`)),
      functions: unique([...content.matchAll(/(?:function|async\s+function)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]))
    };
  })
  .sort((a, b) => a.route.localeCompare(b.route));

const components = files
  .filter(f => /\/components\/.*\.(tsx|ts|jsx|js)$|\\components\\.*\.(tsx|ts|jsx|js)$/.test(f))
  .map(file => {
    const content = read(file);
    return {
      name: path.basename(file),
      file: rel(file),
      imports: unique([...content.matchAll(/import\s+(.+?)\s+from\s+["'](.+?)["']/gs)].map(m => `${m[1].trim()} from ${m[2].trim()}`)),
      apiCalls: unique([...content.matchAll(/["'`]((?:\/api\/)[^"'` )]+)/g)].map(m => m[1])),
      functions: unique([...content.matchAll(/(?:export\s+default\s+function|export\s+function|async\s+function|function)\s+([A-Za-z0-9_]+)/g)].map(m => m[1]))
    };
  })
  .sort((a, b) => a.file.localeCompare(b.file));

const data = { generatedAt: new Date().toISOString(), pages, apis, components };

fs.writeFileSync("HarborGuard-Architecture-Data.json", JSON.stringify(data, null, 2));

let md = "";
md += "# HarborGuard Architecture Report\n\n";
md += `Generated: ${data.generatedAt}\n\n`;
md += `## Summary\n\n`;
md += `- Pages: ${pages.length}\n`;
md += `- API routes: ${apis.length}\n`;
md += `- Components: ${components.length}\n\n`;

md += "## Pages\n\n";
for (const p of pages) {
  md += `### ${p.route}\n`;
  md += `File: \`${p.file}\`\n\n`;
  if (p.apiCalls.length) md += `API calls:\n${p.apiCalls.map(x => `- ${x}`).join("\n")}\n\n`;
  if (p.imports.length) md += `Imports:\n${p.imports.slice(0, 30).map(x => `- ${x}`).join("\n")}\n\n`;
  if (p.functions.length) md += `Functions:\n${p.functions.map(x => `- ${x}`).join("\n")}\n\n`;
}

md += "## API Routes\n\n";
for (const a of apis) {
  md += `### ${a.route}\n`;
  md += `File: \`${a.file}\`\n\n`;
  md += `Methods: ${a.methods.join(", ") || "Unknown"}\n\n`;
  if (a.supabaseTables.length) md += `Supabase tables:\n${a.supabaseTables.map(x => `- ${x}`).join("\n")}\n\n`;
  if (a.functions.length) md += `Functions:\n${a.functions.map(x => `- ${x}`).join("\n")}\n\n`;
}

md += "## Component API Calls\n\n";
for (const c of components.filter(c => c.apiCalls.length)) {
  md += `### ${c.file}\n`;
  md += `${c.apiCalls.map(x => `- ${x}`).join("\n")}\n\n`;
}

fs.writeFileSync("HarborGuard-Architecture-Report.md", md);

console.log("Done.");
console.log("Created HarborGuard-Architecture-Report.md");
console.log("Created HarborGuard-Architecture-Data.json");