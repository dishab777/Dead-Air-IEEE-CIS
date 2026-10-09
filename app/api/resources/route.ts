import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-server";

const BUCKET = "game-resources";
async function isAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data } = await client.auth.getUser(token);
  return !!data.user;
}
export async function GET(request: Request) {
  if (!await isAdmin(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  const db = supabaseAdmin();
  const { data, error } = await db.storage.from(BUCKET).list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const resources = await Promise.all((data || []).filter(f => f.name && !f.name.startsWith(".")).map(async f => {
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(f.name, 3600);
    return { name: f.name, url: signed?.signedUrl || "", created_at: f.created_at };
  }));
  return NextResponse.json({ resources });
}
export async function POST(request: Request) {
  if (!await isAdmin(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size > 15 * 1024 * 1024) return NextResponse.json({ error: "Choose a file smaller than 15 MB." }, { status: 400 });
  const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(-110) || "evidence";
  const name = `${Date.now()}-${safeName}`;
  const { error } = await supabaseAdmin().storage.from(BUCKET).upload(name, await file.arrayBuffer(), { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
export async function DELETE(request: Request) {
  if (!await isAdmin(request)) return NextResponse.json({ error: "Admin sign-in required." }, { status: 401 });
  const { name } = await request.json();
  if (typeof name !== "string" || name.includes("/")) return NextResponse.json({ error: "Invalid resource." }, { status: 400 });
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove([name]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
