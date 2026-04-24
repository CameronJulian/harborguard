import { NextResponse } from "next/server";
import { Resend } from "resend";
import twilio from "twilio";

const resend = new Resend(process.env.RESEND_API_KEY);

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
    ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
    : null;

type NotifyAlertBody = {
  vehicleNickname?: string | null;
  registrationNumber?: string | null;
  alertType?: string;
  severity?: string;
  message?: string;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  recipientEmail?: string | null;
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shouldSendSms(alertType: string, severity: string) {
  return (
    severity === "critical" ||
    alertType === "panic" ||
    alertType === "geofence_breach" ||
    alertType === "route_deviation" ||
    alertType === "offline" ||
    alertType === "long_stop"
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NotifyAlertBody;

    const recipientEmail =
      body.recipientEmail ||
      process.env.FLEET_ALERT_EMAIL ||
      process.env.ALERT_EMAIL;

    const alertType = body.alertType || "unknown";
    const severity = body.severity || "high";

    const vehicleLabel =
      body.vehicleNickname && body.registrationNumber
        ? `${body.vehicleNickname} (${body.registrationNumber})`
        : body.vehicleNickname || body.registrationNumber || "Unknown vehicle";

    const coords =
      typeof body.lastLatitude === "number" && typeof body.lastLongitude === "number"
        ? `${body.lastLatitude}, ${body.lastLongitude}`
        : "Not available";

    const mapsUrl =
      typeof body.lastLatitude === "number" && typeof body.lastLongitude === "number"
        ? `https://maps.google.com/?q=${body.lastLatitude},${body.lastLongitude}`
        : null;

    const subject = `[HarborGuard] ${titleCase(alertType)} alert - ${vehicleLabel}`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2 style="margin-bottom: 8px; color: #b91c1c;">Fleet Alert Notification</h2>
        <p style="margin-top: 0;">A fleet safety alert was triggered in HarborGuard.</p>

        <table style="border-collapse: collapse; width: 100%; max-width: 680px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Vehicle</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${vehicleLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Registration</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${body.registrationNumber || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Alert Type</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${titleCase(alertType)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Severity</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${titleCase(severity)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Message</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${body.message || "-"}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Last Known Coordinates</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${coords}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Map</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">
              ${mapsUrl ? `<a href="${mapsUrl}">Open location in Google Maps</a>` : "-"}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Triggered At</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date().toLocaleString()}</td>
          </tr>
        </table>

        <p style="margin-top: 18px;">
          Open HarborGuard immediately to investigate this fleet event.
        </p>
      </div>
    `;

    let emailData: any = null;
    let smsData: any = null;
    let emailError: string | null = null;
    let smsError: string | null = null;

    if (recipientEmail) {
      const { data, error } = await resend.emails.send({
        from:
          process.env.RESEND_FROM_EMAIL ||
          "HarborGuard <onboarding@resend.dev>",
        to: recipientEmail,
        subject,
        html,
      });

      if (error) {
        emailError = error.message || "Failed to send email.";
      } else {
        emailData = data;
      }
    }

    if (
      shouldSendSms(alertType, severity) &&
      twilioClient &&
      process.env.TWILIO_SMS_FROM &&
      process.env.TWILIO_SMS_TO
    ) {
      try {
        const smsBody =
          `HARBORGUARD ALERT\n` +
          `${titleCase(alertType)} - ${titleCase(severity)}\n` +
          `Vehicle: ${vehicleLabel}\n` +
          `Message: ${body.message || "-"}\n` +
          `Coords: ${coords}` +
          (mapsUrl ? `\nMap: ${mapsUrl}` : "");

        smsData = await twilioClient.messages.create({
          body: smsBody,
          from: process.env.TWILIO_SMS_FROM,
          to: process.env.TWILIO_SMS_TO,
        });
      } catch (err: any) {
        smsError = err.message || "Failed to send SMS.";
      }
    }

    if (!emailData && !smsData) {
      return NextResponse.json(
        {
          error:
            emailError ||
            smsError ||
            "No notification channel is configured. Check email or Twilio environment variables.",
          channels: {
            email: false,
            sms: false,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Fleet alert notification processed.",
      channels: {
        email: !!emailData,
        sms: !!smsData,
      },
      data: {
        email: emailData,
        smsSid: smsData?.sid || null,
      },
      warnings: {
        email: emailError,
        sms: smsError,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to notify alert." },
      { status: 500 }
    );
  }
}