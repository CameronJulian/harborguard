import assert from "node:assert/strict";
import fs from "node:fs";

const providerPath =
  "lib/vision/provider.ts";

const provider =
  fs.readFileSync(
    providerPath,
    "utf8"
  );

assert.doesNotMatch(
  provider,
  /fetch\s*\(\s*input\.imageUrl\s*\)/
);

assert.match(
  provider,
  /Ollama Vision does not fetch remote image URLs/
);

assert.match(
  provider,
  /Supply frameBase64 instead/
);

assert.match(
  provider,
  /fetch\("https:\/\/api\.openai\.com\/v1\/responses"/
);

assert.match(
  provider,
  /image_url:\s*imageInput/
);

console.log(
  "Vision remote-image SSRF contract passed."
);