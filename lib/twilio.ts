import Twilio from "twilio";

const client = Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSMS(message: string) {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_SMS_FROM!,
    to: process.env.TWILIO_SMS_TO!,
  });
}