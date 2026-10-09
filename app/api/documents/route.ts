import { NextResponse } from "next/server";
import { getTeamId } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isDryRun } from "@/lib/runtime-mode";
import { getDryRunTeam, patchDryRunTeam } from "@/lib/dry-run-store";
import { caseFiles } from "@/lib/case-files";

const BUCKET = "game-resources";

// ── GET /api/documents?type=case|hint ──────────────────────────────────────────
// Returns all documents of the given type with unlock status for this team.
export async function GET(request: Request) {
  const teamId = await getTeamId();
  if (!teamId) return NextResponse.json({ error: "No active team session." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") as "case" | "hint" | null;

  if (isDryRun) {
    const team = getDryRunTeam(teamId);
    if (!team) return NextResponse.json({ error: "Team session is no longer valid." }, { status: 401 });
    const progress = team.progress_status ?? {};
    const unlockedHints: string[] = Array.isArray(progress.unlocked_hints) ? (progress.unlocked_hints as string[]) : [];

    // Dry-run: serve the in-code case files (no storage needed)
    const allDocs = [
      ...caseFiles.slice(0, 4).map((f, i) => ({
        id: `case-0${i + 1}`,
        type: "case" as const,
        title: f.title,
        description: f.classification,
        sort_order: i + 1,
        unlocked: true,
        body: f.body,        // inline body for dry-run case files
        url: null,
      })),
      { id: "hint-01", type: "hint" as const, title: "The Red Ledger",       description: "Personnel sign-out log — something is wrong.",     sort_order: 1, unlocked: unlockedHints.includes("hint-01"), url: null },
      { id: "hint-02", type: "hint" as const, title: "The Silent Room",      description: "True facility schematic with the hidden route.",    sort_order: 2, unlocked: unlockedHints.includes("hint-02"), url: null },
      { id: "hint-03", type: "hint" as const, title: "The Vanishing Voice",  description: "Audio recovery — what did Adrian actually say?",    sort_order: 3, unlocked: unlockedHints.includes("hint-03"), url: null },
      { id: "hint-04", type: "hint" as const, title: "The Meridian Vector",  description: "Distribution routing map — the viral path.",        sort_order: 4, unlocked: unlockedHints.includes("hint-04"), url: null },
    ];

    // For unlocked hint files in dry-run, serve inline text from caseFiles[4..7]
    const hintBodies: Record<string, string> = {};
    caseFiles.slice(4).forEach((f, i) => { hintBodies[`hint-0${["A","B","C","D"][i]?.charCodeAt(0)-64}`] = f.body; });
    const hintInline = [
      { id: "hint-01", body: caseFiles[4]?.body ?? "" },
      { id: "hint-02", body: caseFiles[5]?.body ?? "" },
      { id: "hint-03", body: caseFiles[6]?.body ?? "" },
      { id: "hint-04", body: caseFiles[7]?.body ?? "" },
    ];

    const result = allDocs
      .filter(d => !type || d.type === type)
      .map(d => {
        if (d.type === "hint" && d.unlocked) {
          const inline = hintInline.find(h => h.id === d.id);
          return { ...d, body: inline?.body ?? "" };
        }
        return d;
      });

    return NextResponse.json({ documents: result });
  }

  // ── Production: Supabase ───────────────────────────────────────────────────
  const db = supabaseAdmin();
  const query = db.from("documents").select("id,type,title,description,storage_path,sort_order").order("sort_order");
  if (type) query.eq("type", type);
  const { data: docs, error: docsErr } = await query;
  if (docsErr) return NextResponse.json({ error: docsErr.message }, { status: 500 });

  // Which docs has this team already unlocked?
  const { data: unlocks } = await db
    .from("team_unlocks")
    .select("document_id")
    .eq("team_id", teamId);
  const unlockedSet = new Set((unlocks ?? []).map(u => u.document_id));

  // Build response — include signed URL only for unlocked / case files
  const documents = await Promise.all((docs ?? []).map(async doc => {
    const isCase = doc.type === "case";
    const isUnlocked = isCase || unlockedSet.has(doc.id);
    let url: string | null = null;
    if (isUnlocked && doc.storage_path) {
      const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(doc.storage_path, 3600);
      url = signed?.signedUrl ?? null;
    }
    return { id: doc.id, type: doc.type, title: doc.title, description: doc.description, sort_order: doc.sort_order, unlocked: isUnlocked, url };
  }));

  return NextResponse.json({ documents });
}

// ── POST /api/documents — try to unlock a hint with a passcode ────────────────
export async function POST(request: Request) {
  const teamId = await getTeamId();
  if (!teamId) return NextResponse.json({ error: "No active team session." }, { status: 401 });

  const { documentId, passcode } = await request.json();
  if (typeof documentId !== "string" || typeof passcode !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (isDryRun) {
    // Hardcoded passcodes for dry-run mode
    const DRY_RUN_PASSCODES: Record<string, string> = {
      "hint-01": "REDINK",
      "hint-02": "ZERODOOR",
      "hint-03": "CARRIER",
      "hint-04": "VECTOR47",
    };
    const expected = DRY_RUN_PASSCODES[documentId];
    if (!expected) return NextResponse.json({ error: "Document not found." }, { status: 404 });
    if (passcode.trim().toUpperCase() !== expected) {
      return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
    }
    // Record unlock in dry-run progress
    const team = getDryRunTeam(teamId);
    if (!team) return NextResponse.json({ error: "Team session is no longer valid." }, { status: 401 });
    const progress = { ...(team.progress_status ?? {}) };
    const prev: string[] = Array.isArray(progress.unlocked_hints) ? (progress.unlocked_hints as string[]) : [];
    if (!prev.includes(documentId)) {
      patchDryRunTeam(teamId, { progress_status: { ...progress, unlocked_hints: [...prev, documentId] } });
    }
    return NextResponse.json({ ok: true, unlocked: true });
  }

  // ── Production ─────────────────────────────────────────────────────────────
  const db = supabaseAdmin();
  const { data: doc, error: docErr } = await db
    .from("documents")
    .select("id,type,passcode,storage_path")
    .eq("id", documentId)
    .eq("type", "hint")
    .maybeSingle();
  if (docErr || !doc) return NextResponse.json({ error: "Document not found." }, { status: 404 });

  if (passcode.trim().toUpperCase() !== doc.passcode.trim().toUpperCase()) {
    return NextResponse.json({ error: "Incorrect passcode." }, { status: 401 });
  }

  // Record the unlock (idempotent)
  await db.from("team_unlocks").upsert({ team_id: teamId, document_id: documentId }, { onConflict: "team_id,document_id" });

  // Return a fresh signed URL
  let url: string | null = null;
  if (doc.storage_path) {
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrl(doc.storage_path, 3600);
    url = signed?.signedUrl ?? null;
  }
  return NextResponse.json({ ok: true, unlocked: true, url });
}
