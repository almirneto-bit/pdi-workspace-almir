import { NextResponse } from "next/server";
import { isWorkspaceAuthenticated } from "@/lib/server-auth";
import { seedTracks } from "@/lib/seed";
import { createAdminClient } from "@/utils/supabase/admin";
import type { PdiTrack } from "@/types/pdi";

async function ensureSeedData() {
  const supabase = createAdminClient();
  const { data: existing, error } = await supabase
    .from("pdi_tracks")
    .select("id, slug")
    .limit(1);

  if (error) throw error;
  if (existing && existing.length > 0) return;

  const rows = seedTracks.map((track) => ({
    slug: track.id,
    development_point: track.developmentPoint,
    objective: track.objective,
    action: track.action,
    how: track.how,
    expected_result: track.expectedResult,
    deadline: track.deadline,
    observation: track.observation,
    progress: track.progress,
    status: track.status,
  }));

  const { error: insertError } = await supabase.from("pdi_tracks").insert(rows);
  if (insertError) throw insertError;
}

async function getDbTrackId(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("pdi_tracks").select("id").eq("slug", slug).single();
  if (error) throw error;
  return data.id as string;
}

async function addHistory(trackId: string, label: string, actor = "Almir") {
  const supabase = createAdminClient();
  const { error } = await supabase.from("pdi_history").insert({
    track_id: trackId,
    actor_label: actor,
    label,
  });

  if (error) {
    const { error: legacyError } = await supabase.from("pdi_history").insert({
      track_id: trackId,
      label,
    });
    if (legacyError) throw error;
  }
}

async function loadTracks(): Promise<PdiTrack[]> {
  await ensureSeedData();
  const supabase = createAdminClient();

  const { data: tracks, error } = await supabase
    .from("pdi_tracks")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;

  const ids = (tracks ?? []).map((track) => track.id);
  const empty = { data: [], error: null };

  const [updatesResult, historyResult, checklistResult, notesResult] =
    ids.length > 0
      ? await Promise.all([
          supabase.from("pdi_updates").select("*").in("track_id", ids).order("created_at", { ascending: false }),
          supabase.from("pdi_history").select("*").in("track_id", ids).order("created_at", { ascending: false }),
          supabase.from("pdi_checklist_items").select("*").in("track_id", ids).order("created_at", { ascending: true }),
          supabase.from("pdi_notes").select("*").in("track_id", ids).order("created_at", { ascending: false }),
        ])
      : [empty, empty, empty, empty];

  if (updatesResult.error) throw updatesResult.error;
  if (historyResult.error) throw historyResult.error;
  if (checklistResult.error) throw checklistResult.error;
  if (notesResult.error) throw notesResult.error;

  return (tracks ?? []).map((track) => ({
    id: track.slug,
    developmentPoint: track.development_point,
    objective: track.objective,
    action: track.action,
    how: track.how,
    expectedResult: track.expected_result,
    deadline: track.deadline ?? "",
    observation: track.observation ?? "",
    progress: track.progress,
    status: track.status,
    updates: (updatesResult.data ?? [])
      .filter((item) => item.track_id === track.id)
      .map((item) => {
        const legacyMatch =
          !item.author_label && typeof item.content === "string"
            ? item.content.match(/^\[([^\]]+)\]\s([\s\S]*)$/)
            : null;

        return {
          id: item.id,
          author: item.author_label || legacyMatch?.[1] || "Usuário",
          content: legacyMatch?.[2] || item.content,
          createdAt: item.created_at,
        };
      }),
    history: (historyResult.data ?? [])
      .filter((item) => item.track_id === track.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        createdAt: item.created_at,
      })),
    checklist: (checklistResult.data ?? [])
      .filter((item) => item.track_id === track.id)
      .map((item) => ({
        id: item.id,
        content: item.content,
        completed: item.completed,
        createdAt: item.created_at,
      })),
    notes: (notesResult.data ?? [])
      .filter((item) => item.track_id === track.id)
      .map((item) => ({
        id: item.id,
        author: item.author_label || "Almir",
        section: item.section,
        content: item.content,
        createdAt: item.created_at,
      })),
  })) as PdiTrack[];
}

function explainSupabaseError(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message?: unknown }).message)
        : "Erro desconhecido.";

  const lower = raw.toLowerCase();

  if (lower.includes("server credentials are not configured")) {
    return {
      code: "SUPABASE_SECRET_MISSING",
      message:
        "A chave secreta do Supabase não está disponível neste deploy. Confira SUPABASE_SECRET_KEY no Vercel e faça um novo Redeploy.",
    };
  }

  if (lower.includes("invalid api key") || lower.includes("jwt") || lower.includes("unauthorized")) {
    return {
      code: "SUPABASE_SECRET_INVALID",
      message:
        "A chave secreta do Supabase parece inválida. Confira SUPABASE_SECRET_KEY no Vercel e faça um novo Redeploy.",
    };
  }

  if (
    lower.includes("pdi_checklist_items") ||
    lower.includes("pdi_notes")
  ) {
    return {
      code: "PDI_V2_MIGRATION",
      message:
        "A atualização de checklist e comentários ainda não foi aplicada no Supabase. Execute supabase/migration_v2.sql no SQL Editor.",
    };
  }

  if (lower.includes("does not exist") || lower.includes("schema cache") || lower.includes("relation")) {
    return {
      code: "SUPABASE_SCHEMA",
      message:
        "As tabelas do PDI não foram encontradas no Supabase. Execute o arquivo supabase/schema.sql no SQL Editor.",
    };
  }

  if (lower.includes("fetch failed") || lower.includes("network")) {
    return {
      code: "SUPABASE_NETWORK",
      message: "Não foi possível alcançar o Supabase agora. Tente novamente em alguns instantes.",
    };
  }

  return { code: "SUPABASE_UNKNOWN", message: raw || "Erro ao acessar o Supabase." };
}

export async function GET() {
  if (!(await isWorkspaceAuthenticated())) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    return NextResponse.json({ tracks: await loadTracks() });
  } catch (error) {
    const explained = explainSupabaseError(error);
    return NextResponse.json(explained, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isWorkspaceAuthenticated())) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createAdminClient();

    if (body.action === "update-track") {
      const track = body.track as PdiTrack;
      const trackId = await getDbTrackId(track.id);

      const { error: updateError } = await supabase
        .from("pdi_tracks")
        .update({
          development_point: track.developmentPoint,
          objective: track.objective,
          action: track.action,
          how: track.how,
          expected_result: track.expectedResult,
          deadline: track.deadline,
          observation: track.observation,
          progress: track.progress,
          status: track.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trackId);

      if (updateError) throw updateError;
      await addHistory(trackId, body.label || "Planejamento atualizado", body.author || "Almir");
    }

    if (body.action === "add-update") {
      const trackId = await getDbTrackId(body.trackId);
      const author = body.author || "Almir";

      const { error: updateError } = await supabase.from("pdi_updates").insert({
        track_id: trackId,
        author_label: author,
        content: body.content,
      });

      if (updateError) {
        const { error: legacyUpdateError } = await supabase.from("pdi_updates").insert({
          track_id: trackId,
          content: `[${author}] ${body.content}`,
        });
        if (legacyUpdateError) throw updateError;
      }

      await addHistory(trackId, `Nova atualização adicionada por ${author}`, author);
    }

    if (body.action === "add-checklist") {
      const trackId = await getDbTrackId(body.trackId);
      const { error } = await supabase.from("pdi_checklist_items").insert({
        track_id: trackId,
        content: body.content,
        completed: false,
      });
      if (error) throw error;
      await addHistory(trackId, "Novo item adicionado ao checklist", body.author || "Almir");
    }

    if (body.action === "toggle-checklist") {
      const { error } = await supabase
        .from("pdi_checklist_items")
        .update({ completed: Boolean(body.completed), completed_at: body.completed ? new Date().toISOString() : null })
        .eq("id", body.itemId);
      if (error) throw error;

      const trackId = await getDbTrackId(body.trackId);
      await addHistory(trackId, body.completed ? "Item do checklist concluído" : "Item do checklist reaberto", body.author || "Almir");
    }

    if (body.action === "delete-checklist") {
      const { error } = await supabase.from("pdi_checklist_items").delete().eq("id", body.itemId);
      if (error) throw error;
      const trackId = await getDbTrackId(body.trackId);
      await addHistory(trackId, "Item removido do checklist", body.author || "Almir");
    }

    if (body.action === "add-note") {
      const trackId = await getDbTrackId(body.trackId);
      const { error } = await supabase.from("pdi_notes").insert({
        track_id: trackId,
        author_label: body.author || "Almir",
        section: body.section === "action" ? "action" : "general",
        content: body.content,
      });
      if (error) throw error;
      await addHistory(
        trackId,
        body.section === "action" ? "Comentário adicionado à ação" : "Insight geral adicionado",
        body.author || "Almir",
      );
    }

    if (body.action === "edit-note") {
      const { error } = await supabase
        .from("pdi_notes")
        .update({ content: body.content })
        .eq("id", body.noteId);
      if (error) throw error;
      const trackId = await getDbTrackId(body.trackId);
      await addHistory(trackId, "Comentário editado", body.author || "Almir");
    }

    if (body.action === "delete-note") {
      const { error } = await supabase
        .from("pdi_notes")
        .delete()
        .eq("id", body.noteId);
      if (error) throw error;
      const trackId = await getDbTrackId(body.trackId);
      await addHistory(trackId, "Comentário excluído", body.author || "Almir");
    }

    if (body.action === "edit-update") {
      const author = body.author || "Almir";
      const { error } = await supabase
        .from("pdi_updates")
        .update({
          content: body.content,
          author_label: author,
        })
        .eq("id", body.updateId);

      if (error) {
        const { error: legacyError } = await supabase
          .from("pdi_updates")
          .update({ content: `[${author}] ${body.content}` })
          .eq("id", body.updateId);
        if (legacyError) throw error;
      }

      const trackId = await getDbTrackId(body.trackId);
      await addHistory(trackId, "Atualização editada", author);
    }

    if (body.action === "delete-update") {
      const { error } = await supabase
        .from("pdi_updates")
        .delete()
        .eq("id", body.updateId);
      if (error) throw error;
      const trackId = await getDbTrackId(body.trackId);
      await addHistory(trackId, "Atualização excluída", body.author || "Almir");
    }

    if (body.action === "reset") {
      for (const table of ["pdi_notes", "pdi_checklist_items", "pdi_history", "pdi_updates"]) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
      }

      for (const track of seedTracks) {
        const { error: resetError } = await supabase
          .from("pdi_tracks")
          .update({
            development_point: track.developmentPoint,
            objective: track.objective,
            action: track.action,
            how: track.how,
            expected_result: track.expectedResult,
            deadline: track.deadline,
            observation: track.observation,
            progress: track.progress,
            status: track.status,
            updated_at: new Date().toISOString(),
          })
          .eq("slug", track.id);

        if (resetError) throw resetError;
      }
    }

    return NextResponse.json({ tracks: await loadTracks() });
  } catch (error) {
    const explained = explainSupabaseError(error);
    return NextResponse.json(explained, { status: 500 });
  }
}
