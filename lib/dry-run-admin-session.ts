import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "echo_admin";

function signature(value: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");
  return createHmac("sha256", secret).update(`admin:${value}`).digest("hex");
}

export function dryRunAdminCookie() {
  const value = `1.${signature("local")}`;
  return { name: COOKIE, value, httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 12 };
}

export function hasDryRunAdminSession(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE}=`));
  const value = cookie?.slice(COOKIE.length + 1);
  if (!value) return false;
  const [marker, supplied] = value.split(".");
  if (marker !== "1" || !supplied) return false;
  const expected = signature("local");
  const a = Buffer.from(supplied, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export { COOKIE as DRY_RUN_ADMIN_COOKIE };
