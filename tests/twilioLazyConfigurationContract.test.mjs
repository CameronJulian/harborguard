import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helper = fs.readFileSync(
  new URL(
    "../lib/twilio.ts",
    import.meta.url,
  ),
  "utf8",
);

const notifyRoute = fs.readFileSync(
  new URL(
    "../app/api/fleet/notify-alert/route.ts",
    import.meta.url,
  ),
  "utf8",
);

test(
  "Twilio client construction is lazy",
  () => {
    assert.match(
      helper,
      /export\s+function\s+getTwilioClient\s*\(/,
    );

    assert.doesNotMatch(
      helper,
      /^const\s+client\s*=\s*Twilio\s*\(/m,
    );

    assert.match(
      helper,
      /cachedClient/,
    );

    assert.match(
      helper,
      /Twilio\s*\(\s*accountSid,\s*authToken/,
    );
  },
);

test(
  "Twilio configuration rejects placeholders and malformed account SID",
  () => {
    assert.match(
      helper,
      /looksLikePlaceholder/,
    );

    assert.match(
      helper,
      /accountSid\.startsWith\("AC"\)/,
    );

    assert.match(
      helper,
      /if\s*\(\s*!accountSid\s*\|\|\s*!authToken\s*\)/,
    );
  },
);

test(
  "notify-alert does not construct Twilio at module scope",
  () => {
    assert.doesNotMatch(
      notifyRoute,
      /import\s+twilio\s+from\s+["']twilio["']/,
    );

    assert.doesNotMatch(
      notifyRoute,
      /const\s+twilioClient\s*=\s*process\.env\.TWILIO_ACCOUNT_SID/,
    );

    assert.match(
      notifyRoute,
      /import\s+\{\s*getTwilioClient\s*\}\s+from\s+["']@\/lib\/twilio["']/,
    );

    assert.match(
      notifyRoute,
      /const\s+twilioClient\s*=\s*getTwilioClient\(\)/,
    );
  },
);

test(
  "existing SMS and WhatsApp sends remain guarded by nullable Twilio client",
  () => {
    assert.match(
      notifyRoute,
      /shouldSendSms[\s\S]*?twilioClient\s*&&[\s\S]*?TWILIO_SMS_FROM[\s\S]*?TWILIO_SMS_TO/,
    );

    assert.match(
      notifyRoute,
      /shouldSendWhatsApp[\s\S]*?twilioClient\s*&&[\s\S]*?TWILIO_WHATSAPP_FROM/,
    );

    assert.match(
      notifyRoute,
      /twilioClient\.messages\.create\s*\(/,
    );
  },
);
