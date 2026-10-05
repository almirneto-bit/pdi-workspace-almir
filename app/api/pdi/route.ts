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
    how: "",
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

function parseExecutionItems(how: string) {
  const normalized = String(how || "").trim();
  if (!normalized) return [];

  const numbered = normalized
    .split(/\n\s*\n|\n(?=\s*\d+[.)]\s)/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean);

  return numbered.length > 1 ? numbered : [normalized];
}

async function syncTrackProgress(trackId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pdi_checklist_items")
    .select("completed")
    .eq("track_id", trackId);

  if (error) throw error;

  const total = data?.length ?? 0;
  const completed = data?.filter((item) => item.completed).length ?? 0;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const { error: updateError } = await supabase
    .from("pdi_tracks")
    .update({
      progress,
      status: progress === 100 ? "Concluído" : progress > 0 ? "Em andamento" : "Não iniciado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", trackId);

  if (updateError) throw updateError;
  return progress;
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

  const [updatesResult, historyResult, firstChecklistResult, notesResult] =
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
  if (firstChecklistResult.error) throw firstChecklistResult.error;
  if (notesResult.error) throw notesResult.error;

  // Migração automática da V1: os antigos itens numerados de "Como executar"
  // passam a ser itens persistentes do checklist. Depois disso o campo textual
  // é limpo, evitando recriar itens caso todos sejam removidos posteriormente.
  let checklistData = firstChecklistResult.data ?? [];

  for (const track of tracks ?? []) {
    const hasChecklist = checklistData.some((item) => item.track_id === track.id);
    const executionItems = parseExecutionItems(track.how);

    if (!hasChecklist && executionItems.length > 0) {
      const { error: insertError } = await supabase.from("pdi_checklist_items").insert(
        executionItems.map((content) => ({
          track_id: track.id,
          content,
          completed: false,
        })),
      );
      if (insertError) throw insertError;

      const { error: clearError } = await supabase
        .from("pdi_tracks")
        .update({ how: "", updated_at: new Date().toISOString() })
        .eq("id", track.id);
      if (clearError) throw clearError;
    }
  }

  if ((tracks ?? []).some((track) => parseExecutionItems(track.how).length > 0)) {
    const refreshed = await supabase
      .from("pdi_checklist_items")
      .select("*")
      .in("track_id", ids)
      .order("created_at", { ascending: true });
    if (refreshed.error) throw refreshed.error;
    checklistData = refreshed.data ?? [];
  }

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
    checklist: checklistData
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

    if (body.action === "create-track") {
      const title = String(body.track?.developmentPoint || "").trim();
      if (!title) {
        return NextResponse.json({ message: "Informe o nome da nova trilha." }, { status: 400 });
      }

      const baseSlug = title
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 54) || "nova-trilha";

      const slug = `${baseSlug}-${Date.now().toString(36)}`;

      const payload = {
        slug,
        development_point: title,
        objective: String(body.track?.objective || "").trim(),
        action: String(body.track?.action || "").trim(),
        how: String(body.track?.how || "").trim(),
        expected_result: String(body.track?.expectedResult || "").trim(),
        deadline: String(body.track?.deadline || "").trim(),
        observation: String(body.track?.observation || "").trim(),
        progress: Number(body.track?.progress || 0),
        status: body.track?.status || "Não iniciado",
      };

      const { data: created, error } = await supabase
        .from("pdi_tracks")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;

      await addHistory(created.id, "Trilha criada", body.author || "Almir");
    }

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
      await syncTrackProgress(trackId);
      await addHistory(trackId, "Novo item adicionado ao checklist", body.author || "Almir");
    }

    if (body.action === "toggle-checklist") {
      const { error } = await supabase
        .from("pdi_checklist_items")
        .update({ completed: Boolean(body.completed), completed_at: body.completed ? new Date().toISOString() : null })
        .eq("id", body.itemId);
      if (error) throw error;

      const trackId = await getDbTrackId(body.trackId);
      await syncTrackProgress(trackId);
      await addHistory(trackId, body.completed ? "Item do checklist concluído" : "Item do checklist reaberto", body.author || "Almir");
    }

    if (body.action === "edit-checklist") {
      const content = String(body.content || "").trim();
      if (!content) {
        return NextResponse.json({ message: "O item não pode ficar vazio." }, { status: 400 });
      }

      const { error } = await supabase
        .from("pdi_checklist_items")
        .update({ content })
        .eq("id", body.itemId);
      if (error) throw error;

      const trackId = await getDbTrackId(body.trackId);
      await addHistory(trackId, "Ação prática do checklist editada", body.author || "Almir");
    }

    if (body.action === "delete-checklist") {
      const { error } = await supabase.from("pdi_checklist_items").delete().eq("id", body.itemId);
      if (error) throw error;
      const trackId = await getDbTrackId(body.trackId);
      await syncTrackProgress(trackId);
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
