import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NotifyAlertBody;

    const recipientEmail =
      body.recipientEmail ||
      process.env.FLEET_ALERT_EMAIL ||
      process.env.ALERT_EMAIL;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No fleet alert recipient email is configured." },
        { status: 400 }
      );
    }

    const alertType = body.alertType || "unknown";
    const severity = body.severity || "high";
    const vehicleLabel =
      body.vehicleNickname || body.registrationNumber || "Unknown vehicle";

    const subject = `[HarborGuard] ${titleCase(alertType)} alert - ${vehicleLabel}`;

    const coords =
      typeof body.lastLatitude === "number" && typeof body.lastLongitude === "number"
        ? `${body.lastLatitude}, ${body.lastLongitude}`
        : "Not available";

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
            <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: 700;">Triggered At</td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date().toLocaleString()}</td>
          </tr>
        </table>

        <p style="margin-top: 18px;">
          Open HarborGuard immediately to investigate this fleet event.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "HarborGuard <onboarding@resend.dev>",
      to: recipientEmail,
      subject,
      html,
    });

    if (error) {
      return NextResponse.json({ error: error.message || "Failed to send email." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Fleet alert notification sent successfully.",
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to notify alert." },
      { status: 500 }
    );
  }
}