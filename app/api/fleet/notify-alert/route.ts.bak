import { NextResponse } from "next/server";
import { Resend } from "resend";
import twilio from "twilio";

const resend = new Resend(process.env.RESEND_API_KEY);

const twilioClient =
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN
    ? twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      )
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
  intelligenceScore?: number | null;
  behavioralRisk?: string | null;
  broadcastGroup?: string | null;
whatsAppRecipients?: string[] | null;
};

function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) =>
      char.toUpperCase()
    );
}

function shouldSendSms(
  alertType: string,
  severity: string
) {
  return (
    severity === "critical" ||
    alertType === "panic" ||
    alertType === "geofence_breach" ||
    alertType === "route_deviation" ||
    alertType === "offline" ||
    alertType === "long_stop"
  );
}

function shouldSendWhatsApp(
  alertType: string,
  severity: string
) {
  return (
    severity === "critical" ||
    severity === "high" ||
    alertType === "panic" ||
    alertType === "driver_fatigue" ||
    alertType === "geofence_breach"
  );
}

function determineEscalationLevel(
  severity: string,
  intelligenceScore: number
) {
  if (
    severity === "critical" ||
    intelligenceScore >= 90
  ) {
    return {
      level: "LEVEL 4",
      color: "#7f1d1d",
      response:
        "Immediate executive intervention required.",
    };
  }

  if (
    severity === "high" ||
    intelligenceScore >= 70
  ) {
    return {
      level: "LEVEL 3",
      color: "#b91c1c",
      response:
        "Rapid operational response recommended.",
    };
  }

  if (intelligenceScore >= 45) {
    return {
      level: "LEVEL 2",
      color: "#d97706",
      response:
        "Enhanced monitoring and investigation recommended.",
    };
  }

  return {
    level: "LEVEL 1",
    color: "#2563eb",
    response:
      "Standard operational monitoring active.",
  };
}

export async function POST(req: Request) {
  try {
    const body =
      (await req.json()) as NotifyAlertBody;

    const recipientEmail =
      body.recipientEmail ||
      process.env.FLEET_ALERT_EMAIL ||
      process.env.ALERT_EMAIL;

    const alertType =
      body.alertType || "unknown";

    const severity =
      body.severity || "high";

    const intelligenceScore = Number(
      body.intelligenceScore || 0
    );

    const escalation =
      determineEscalationLevel(
        severity,
        intelligenceScore
      );

    const vehicleLabel =
      body.vehicleNickname &&
      body.registrationNumber
        ? `${body.vehicleNickname} (${body.registrationNumber})`
        : body.vehicleNickname ||
          body.registrationNumber ||
          "Unknown vehicle";

    const coords =
      typeof body.lastLatitude ===
        "number" &&
      typeof body.lastLongitude ===
        "number"
        ? `${body.lastLatitude}, ${body.lastLongitude}`
        : "Not available";

    const mapsUrl =
      typeof body.lastLatitude ===
        "number" &&
      typeof body.lastLongitude ===
        "number"
        ? `https://maps.google.com/?q=${body.lastLatitude},${body.lastLongitude}`
        : null;

    const subject =
      `[HarborGuard ${escalation.level}] ` +
      `${titleCase(alertType)} - ${vehicleLabel}`;

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        
        <div
          style="
            background:${escalation.color};
            color:#fff;
            padding:20px;
            border-radius:14px;
            margin-bottom:20px;
          "
        >
          <div style="font-size:13px;font-weight:700;opacity:.85;">
            AUTONOMOUS ESCALATION ENGINE
          </div>

          <div style="font-size:34px;font-weight:900;margin-top:6px;">
            ${escalation.level}
          </div>

          <div style="margin-top:10px;font-size:15px;">
            ${escalation.response}
          </div>
        </div>

        <h2 style="margin-bottom: 8px; color: #b91c1c;">
          Fleet Alert Notification
        </h2>

        <p style="margin-top: 0;">
          HarborGuard AI systems triggered an autonomous operational escalation.
        </p>

        <table style="border-collapse: collapse; width: 100%; max-width: 680px;">
          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;">
              Vehicle
            </td>

            <td style="padding:8px;border:1px solid #e5e7eb;">
              ${vehicleLabel}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;">
              Alert Type
            </td>

            <td style="padding:8px;border:1px solid #e5e7eb;">
              ${titleCase(alertType)}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;">
              Severity
            </td>

            <td style="padding:8px;border:1px solid #e5e7eb;">
              ${titleCase(severity)}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;">
              AI Intelligence Score
            </td>

            <td style="padding:8px;border:1px solid #e5e7eb;">
              ${intelligenceScore}/100
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;">
              Behavioral Risk
            </td>

            <td style="padding:8px;border:1px solid #e5e7eb;">
              ${body.behavioralRisk || "-"}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;">
              Message
            </td>

            <td style="padding:8px;border:1px solid #e5e7eb;">
              ${body.message || "-"}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;">
              Coordinates
            </td>

            <td style="padding:8px;border:1px solid #e5e7eb;">
              ${coords}
            </td>
          </tr>

          <tr>
            <td style="padding:8px;border:1px solid #e5e7eb;font-weight:700;">
              Map
            </td>

            <td style="padding:8px;border:1px solid #e5e7eb;">
              ${
                mapsUrl
                  ? `<a href="${mapsUrl}">Open in Google Maps</a>`
                  : "-"
              }
            </td>
          </tr>
        </table>

        <p style="margin-top:18px;">
          Open HarborGuard immediately to investigate this operational escalation.
        </p>
      </div>
    `;

    let emailData: any = null;
    let smsData: any = null;
	let whatsappData: any[] = [];
let whatsappError: string | null = null;
    let emailError: string | null = null;
    let smsError: string | null = null;

    if (recipientEmail) {
      const { data, error } =
        await resend.emails.send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "HarborGuard <onboarding@resend.dev>",
          to: recipientEmail,
          subject,
          html,
        });

      if (error) {
        emailError =
          error.message ||
          "Failed to send email.";
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
          `HARBORGUARD ${escalation.level}\n` +
          `${titleCase(alertType)}\n` +
          `Severity: ${titleCase(severity)}\n` +
          `Vehicle: ${vehicleLabel}\n` +
          `AI Score: ${intelligenceScore}/100\n` +
          `Message: ${body.message || "-"}\n` +
          `Coords: ${coords}` +
          (mapsUrl
            ? `\nMap: ${mapsUrl}`
            : "");

        smsData =
          await twilioClient.messages.create({
            body: smsBody,
            from:
              process.env.TWILIO_SMS_FROM,
            to: process.env.TWILIO_SMS_TO,
          });
      } catch (err: any) {
        smsError =
          err.message ||
          "Failed to send SMS.";
      }
    }
	if (
  shouldSendWhatsApp(alertType, severity) &&
  twilioClient &&
  process.env.TWILIO_WHATSAPP_FROM
) {
  try {
    const recipients =
      body.whatsAppRecipients ||
      (
        process.env
          .TWILIO_WHATSAPP_TO || ""
      )
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);

    const whatsAppBody =
      `🚨 HARBORGUARD ${escalation.level}\n\n` +
      `Alert: ${titleCase(alertType)}\n` +
      `Severity: ${titleCase(severity)}\n` +
      `Vehicle: ${vehicleLabel}\n` +
      `AI Score: ${intelligenceScore}/100\n` +
      `Behavioral Risk: ${
        body.behavioralRisk || "-"
      }\n` +
      `Message: ${
        body.message || "-"
      }\n` +
      `Coordinates: ${coords}` +
      (mapsUrl
        ? `\n\nMap: ${mapsUrl}`
        : "");

    for (const recipient of recipients) {
      const result =
        await twilioClient.messages.create({
          body: whatsAppBody,
          from:
            process.env
              .TWILIO_WHATSAPP_FROM,
          to: recipient.startsWith(
            "whatsapp:"
          )
            ? recipient
            : `whatsapp:${recipient}`,
        });

      whatsappData.push(result);
    }
  } catch (err: any) {
    whatsappError =
      err.message ||
      "Failed to send WhatsApp alerts.";
  }
}

      if (
      !emailData &&
      !smsData &&
      whatsappData.length === 0
    ) {
      return NextResponse.json(
        {
          error: "Failed to send notifications.",
          warnings: {
            email: emailError,
            sms: smsError,
            whatsapp: whatsappError,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      escalationLevel: escalation.level,
      message: "Autonomous escalation workflow executed.",
      channels: {
        email: !!emailData,
        sms: !!smsData,
        whatsapp: whatsappData.length > 0,
      },
      warnings: {
        email: emailError,
        sms: smsError,
        whatsapp: whatsappError,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Escalation workflow failed.",
      },
      { status: 500 }
    );
  }
}