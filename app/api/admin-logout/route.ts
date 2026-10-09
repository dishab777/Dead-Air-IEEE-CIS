import { NextResponse } from "next/server";
import { DRY_RUN_ADMIN_COOKIE } from "@/lib/dry-run-admin-session";
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(DRY_RUN_ADMIN_COOKIE);
  return response;
}
