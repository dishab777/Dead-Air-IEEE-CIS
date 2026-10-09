import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "echo_team";
function signature(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export function sessionCookie(teamId: string) {
  const value = `${teamId}.${signature(teamId)}`;
  return { name: COOKIE, value, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 12 };
}
export async function getTeamId() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return null;
  const [teamId, supplied] = value.split(".");
  if (!teamId || !supplied) return null;
  const expected = signature(teamId);
  const a = Buffer.from(supplied, "hex"); const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b) ? teamId : null;
}
