import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireOrganization, requireRole } from "@/lib/server-auth";

const ALLOWED_ROLES = ["viewer", "operator", "manager", "admin"];

export async function GET() {
  try {
    const { supabase, organizationId, role } = await requireOrganization();
    requireRole(role, ["owner", "admin"]);

    const { data, error } = await supabase
      .from("organization_invitations")
      .select("id, email, role, token, invited_by, accepted_at, expires_at, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, invitations: data || [] });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load invitations." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, user, role } = await requireOrganization();
    requireRole(role, ["owner", "admin"]);

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const inviteRole = String(body.role || "viewer").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    if (!ALLOWED_ROLES.includes(inviteRole)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("organization_invitations")
      .insert({
        organization_id: organizationId,
        email,
        role: inviteRole,
        token,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select("id, email, role, token, accepted_at, expires_at, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/invite/${token}`;

    return NextResponse.json({
      success: true,
      invitation: data,
      inviteUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create invitation." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { supabase, role } = await requireOrganization();
    requireRole(role, ["owner", "admin"]);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Invitation id is required." }, { status: 400 });
    }

    const { error } = await supabase
      .from("organization_invitations")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete invitation." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
