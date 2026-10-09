import { NextResponse } from "next/server";
import { dryRunAdminCookie } from "@/lib/dry-run-admin-session";
import { isDryRun } from "@/lib/runtime-mode";

export async function POST(request: Request) {
  if (!isDryRun) return NextResponse.json({ error: "Local dry-run sign-in is disabled." }, { status: 404 });
  const { email, password } = await request.json();
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword) return NextResponse.json({ error: "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local." }, { status: 503 });
  if (typeof email !== "string" || typeof password !== "string" || email.trim().toLowerCase() !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json({ error: "Organizer email or password was not recognized." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(dryRunAdminCookie());
  return response;
}
