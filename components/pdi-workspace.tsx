"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { seedTracks } from "@/lib/seed";
import type { PdiTrack } from "@/types/pdi";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function PdiWorkspace({ authConfigured }: { authConfigured: boolean }) {
  const [tracks, setTracks] = useState<PdiTrack[]>(seedTracks);
  const [selectedId, setSelectedId] = useState(seedTracks[0].id);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);
  const [isDeadlineEditing, setIsDeadlineEditing] = useState(false);
  const [newUpdate, setNewUpdate] = useState("");
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [actionComment, setActionComment] = useState("");
  const [generalInsight, setGeneralInsight] = useState("");
  const [author, setAuthor] = useState("Almir");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState("");

  useEffect(() => {
    void loadTracks();
  }, []);

  async function loadTracks() {
    setLoading(true);
    setSyncError("");

    const response = await fetch("/api/pdi", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      setSyncError(data.message || "Não foi possível carregar os dados do Supabase.");
      setLoading(false);
      return;
    }

    if (data.tracks?.length) {
      setTracks(data.tracks);
      setSelectedId((current) =>
        data.tracks.some((track: PdiTrack) => track.id === current)
          ? current
          : data.tracks[0].id,
      );
    }

    setLoading(false);
  }

  async function saveAction(payload: Record<string, unknown>) {
    setSaving(true);
    setSyncError("");

    const response = await fetch("/api/pdi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setSyncError(data.message || "Não foi possível salvar no Supabase.");
      return false;
    }

    if (data.tracks?.length) setTracks(data.tracks);
    return true;
  }

  const selected = useMemo(
    () => tracks.find((track) => track.id === selectedId) ?? tracks[0],
    [tracks, selectedId],
  );

  const averageProgress = Math.round(
    tracks.reduce((total, track) => total + track.progress, 0) / Math.max(tracks.length, 1),
  );
  const totalUpdates = tracks.reduce((total, track) => total + track.updates.length, 0);
  const totalHistory = tracks.reduce((total, track) => total + track.history.length, 0);
  const completedChecklist = selected?.checklist.filter((item) => item.completed).length ?? 0;
  const checklistTotal = selected?.checklist.length ?? 0;
  const checklistScore = checklistTotal ? Math.round((completedChecklist / checklistTotal) * 100) : 0;

  async function handleUpdateSubmit(event: FormEvent) {
    event.preventDefault();
    if (!newUpdate.trim() || !selected) return;

    const ok = await saveAction({
      action: "add-update",
      trackId: selected.id,
      author: author.trim() || "Almir",
      content: newUpdate.trim(),
    });

    if (ok) setNewUpdate("");
  }

  async function resetData() {
    if (!window.confirm("Restaurar as trilhas para a base original importada da planilha? Comentários e histórico serão apagados.")) {
      return;
    }

    await saveAction({ action: "reset" });
  }

  async function editNote(noteId: string, currentContent: string) {
    const content = window.prompt("Editar comentário", currentContent);
    if (content === null || !content.trim() || content.trim() === currentContent) return;

    await saveAction({
      action: "edit-note",
      trackId: selected.id,
      noteId,
      content: content.trim(),
      author,
    });
  }

  async function deleteNote(noteId: string) {
    if (!window.confirm("Excluir este comentário?")) return;

    await saveAction({
      action: "delete-note",
      trackId: selected.id,
      noteId,
      author,
    });
  }

  async function editUpdate(updateId: string, currentContent: string) {
    const content = window.prompt("Editar atualização", currentContent);
    if (content === null || !content.trim() || content.trim() === currentContent) return;

    await saveAction({
      action: "edit-update",
      trackId: selected.id,
      updateId,
      content: content.trim(),
      author,
    });
  }

  async function deleteUpdate(updateId: string) {
    if (!window.confirm("Excluir esta atualização?")) return;

    await saveAction({
      action: "delete-update",
      trackId: selected.id,
      updateId,
      author,
    });
  }

  if (!selected) return null;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="workspace-brand">
            <div className="brand-mark small">PDI</div>
            <div>
              <strong>PDI Workspace</strong>
              <span>Almir Neto</span>
            </div>
          </div>

          <nav className="nav-list" aria-label="Trilhas do PDI">
            <p className="nav-label">TRILHAS DE DESENVOLVIMENTO</p>
            {tracks.map((track, index) => (
              <button
                key={track.id}
                className={`nav-item ${selected.id === track.id ? "active" : ""}`}
                onClick={() => setSelectedId(track.id)}
              >
                <span className="nav-index">0{index + 1}</span>
                <span>{track.developmentPoint}</span>
              </button>
            ))}
            <button
              className="new-track-button"
              type="button"
              onClick={() => setIsCreatingTrack(true)}
            >
              <span>＋</span>
              <strong>Nova trilha</strong>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="storage-status">
            <span className={`status-dot ${syncError ? "error" : ""}`} />
            <div>
              <strong>{syncError ? "Falha de sincronização" : "Supabase conectado"}</strong>
              <span>{saving ? "Salvando alterações..." : "Dados compartilhados e persistentes"}</span>
            </div>
          </div>

          {authConfigured ? (
            <form action="/api/auth/logout" method="post">
              <button className="ghost-button full" type="submit">Sair</button>
            </form>
          ) : (
            <p className="warning-note">Proteção por senha ainda não configurada.</p>
          )}
        </div>
      </aside>

      <section className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">PLANO DE DESENVOLVIMENTO</p>
            <h1>Workspace pessoal</h1>
          </div>
          <div className="top-actions">
            <button className="ghost-button" onClick={resetData} disabled={saving}>Restaurar base</button>
            <button className="primary-button compact" onClick={() => setIsEditing(true)} disabled={loading || saving}>
              Editar trilha
            </button>
          </div>
        </header>

        {syncError && (
          <div className="sync-alert">
            <strong>Não foi possível sincronizar.</strong>
            <span>{syncError}</span>
          </div>
        )}

        {loading ? (
          <section className="loading-state">
            <div className="loading-dot" />
            <p>Carregando seu PDI...</p>
          </section>
        ) : (
          <>
            <section className="stats-grid">
              <article className="stat-card">
                <span>Progresso geral</span>
                <strong>{averageProgress}%</strong>
                <div className="mini-progress"><i style={{ width: `${averageProgress}%` }} /></div>
              </article>
              <article className="stat-card">
                <span>Trilhas ativas</span>
                <strong>{tracks.filter((track) => track.status === "Em andamento").length}</strong>
                <small>de {tracks.length} trilhas</small>
              </article>
              <article className="stat-card">
                <span>Atualizações</span>
                <strong>{totalUpdates}</strong>
                <small>registros compartilhados</small>
              </article>
              <article className="stat-card">
                <span>Eventos no histórico</span>
                <strong>{totalHistory}</strong>
                <small>alterações documentadas</small>
              </article>
            </section>

            <section className="track-hero">
              <div className="track-title-row">
                <div>
                  <span className="status-pill">{selected.status}</span>
                  <h2>{selected.developmentPoint}</h2>
                  <p>{selected.objective}</p>
                </div>
                <div
                  className="progress-ring"
                  style={{ "--progress": `${selected.progress * 3.6}deg` } as CSSProperties}
                >
                  <div><strong>{selected.progress}%</strong><span>progresso</span></div>
                </div>
              </div>
            </section>

            <section className="main-grid">
              <div className="main-column">
                <article className="panel">
                  <div className="panel-heading"><span>01</span><h3>Ação principal</h3></div>
                  <p className="lead-copy">{selected.action}</p>

                  <div className="checklist-block">
                    <div className="section-subhead">
                      <div>
                        <span className="section-label">CHECKLIST</span>
                        <strong>{completedChecklist}/{checklistTotal} concluídos</strong>
                      </div>
                      <span className="score-pill">{checklistScore}%</span>
                    </div>

                    <div className="checklist-progress">
                      <i style={{ width: `${checklistScore}%` }} />
                    </div>

                    <div className="checklist-list">
                      {selected.checklist.length === 0 ? (
                        <div className="empty-inline">Adicione pequenos marcos para acompanhar essa ação.</div>
                      ) : (
                        selected.checklist.map((item) => (
                          <div className={`checklist-row ${item.completed ? "done" : ""}`} key={item.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={(event) =>
                                  void saveAction({
                                    action: "toggle-checklist",
                                    trackId: selected.id,
                                    itemId: item.id,
                                    completed: event.target.checked,
                                    author,
                                  })
                                }
                              />
                              <span>{item.content}</span>
                            </label>
                            <button
                              className="icon-text-button"
                              type="button"
                              onClick={() =>
                                void saveAction({
                                  action: "delete-checklist",
                                  trackId: selected.id,
                                  itemId: item.id,
                                  author,
                                })
                              }
                            >
                              Remover
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    <form
                      className="inline-add-form"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        if (!newChecklistItem.trim()) return;
                        const ok = await saveAction({
                          action: "add-checklist",
                          trackId: selected.id,
                          content: newChecklistItem.trim(),
                          author,
                        });
                        if (ok) setNewChecklistItem("");
                      }}
                    >
                      <input
                        value={newChecklistItem}
                        onChange={(event) => setNewChecklistItem(event.target.value)}
                        placeholder="Ex.: Conversar com Hugo sobre cronograma"
                      />
                      <button className="ghost-button" type="submit" disabled={!newChecklistItem.trim() || saving}>
                        + Adicionar
                      </button>
                    </form>
                  </div>

                  <div className="context-comments">
                    <div className="section-subhead">
                      <div>
                        <span className="section-label">COMENTÁRIOS DA AÇÃO</span>
                        <strong>Insights e observações específicas</strong>
                      </div>
                    </div>

                    <form
                      className="comment-form"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        if (!actionComment.trim()) return;
                        const ok = await saveAction({
                          action: "add-note",
                          trackId: selected.id,
                          section: "action",
                          content: actionComment.trim(),
                          author,
                        });
                        if (ok) setActionComment("");
                      }}
                    >
                      <textarea
                        rows={3}
                        value={actionComment}
                        onChange={(event) => setActionComment(event.target.value)}
                        placeholder="Adicione um comentário, aprendizado ou observação sobre essa ação..."
                      />
                      <button className="primary-button compact" type="submit" disabled={!actionComment.trim() || saving}>
                        Comentar
                      </button>
                    </form>

                    <div className="notes-list">
                      {selected.notes.filter((note) => note.section === "action").map((note) => (
                        <div className="note-card" key={note.id}>
                          <div className="note-card-head">
                            <div><strong>{note.author}</strong><span>{formatDate(note.createdAt)}</span></div>
                            <div className="item-actions">
                              <button type="button" onClick={() => void editNote(note.id, note.content)}>Editar</button>
                              <button type="button" className="danger" onClick={() => void deleteNote(note.id)}>Excluir</button>
                            </div>
                          </div>
                          <p>{note.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>

                <article className="panel">
                  <div className="panel-heading"><span>02</span><h3>Como executar</h3></div>
                  <div className="multiline-copy">{selected.how}</div>
                </article>

                <article className="panel">
                  <div className="panel-heading"><span>03</span><h3>Resultado esperado</h3></div>
                  <p>{selected.expectedResult}</p>
                </article>

                <article className="panel updates-panel">
                  <div className="panel-heading"><span>04</span><h3>Atualizações e comentários</h3></div>
                  <form className="update-form" onSubmit={handleUpdateSubmit}>
                    <div className="form-row">
                      <label>
                        Autor
                        <select value={author} onChange={(event) => setAuthor(event.target.value)}>
                          <option>Almir</option>
                          <option>Gestor</option>
                        </select>
                      </label>
                    </div>
                    <textarea
                      value={newUpdate}
                      onChange={(event) => setNewUpdate(event.target.value)}
                      placeholder="Registre um aprendizado, feedback, decisão ou próximo passo..."
                      rows={4}
                    />
                    <button
                      className="primary-button compact"
                      type="submit"
                      disabled={!newUpdate.trim() || saving}
                    >
                      {saving ? "Salvando..." : "Adicionar atualização"}
                    </button>
                  </form>

                  <div className="timeline">
                    {selected.updates.length === 0 ? (
                      <div className="empty-state">Nenhuma atualização registrada nesta trilha ainda.</div>
                    ) : (
                      selected.updates.map((update) => (
                        <div className="timeline-item" key={update.id}>
                          <span className="timeline-dot" />
                          <div>
                            <div className="timeline-meta">
                              <div>
                                <strong>{update.author}</strong>
                                <span>{formatDate(update.createdAt)}</span>
                              </div>
                              <div className="item-actions">
                                <button type="button" onClick={() => void editUpdate(update.id, update.content)}>Editar</button>
                                <button type="button" className="danger" onClick={() => void deleteUpdate(update.id)}>Excluir</button>
                              </div>
                            </div>
                            <p>{update.content}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </div>

              <aside className="side-column">
                <button
                  className="panel compact-panel deadline-card"
                  type="button"
                  onClick={() => setIsDeadlineEditing(true)}
                >
                  <div className="deadline-card-head">
                    <p className="panel-kicker">PRAZO</p>
                    <span className="edit-hint">Editar datas</span>
                  </div>
                  <strong className="deadline">{selected.deadline || "Definir prazo"}</strong>
                  <span className="deadline-help">Clique para abrir o calendário</span>
                </button>

                <article className="panel compact-panel">
                  <div className="side-heading"><h3>Insights gerais</h3><span>{selected.notes.filter((note) => note.section === "general").length}</span></div>
                  <form
                    className="side-note-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!generalInsight.trim()) return;
                      const ok = await saveAction({
                        action: "add-note",
                        trackId: selected.id,
                        section: "general",
                        content: generalInsight.trim(),
                        author,
                      });
                      if (ok) setGeneralInsight("");
                    }}
                  >
                    <textarea
                      rows={3}
                      value={generalInsight}
                      onChange={(event) => setGeneralInsight(event.target.value)}
                      placeholder="Insight, ideia, aprendizado..."
                    />
                    <button className="ghost-button full" type="submit" disabled={!generalInsight.trim() || saving}>
                      Salvar insight
                    </button>
                  </form>
                  <div className="side-notes-list">
                    {selected.notes.filter((note) => note.section === "general").slice(0, 5).map((note) => (
                      <div className="side-note" key={note.id}>
                        <div className="side-note-actions">
                          <small>{note.author} · {formatDate(note.createdAt)}</small>
                          <div className="item-actions">
                            <button type="button" onClick={() => void editNote(note.id, note.content)}>Editar</button>
                            <button type="button" className="danger" onClick={() => void deleteNote(note.id)}>Excluir</button>
                          </div>
                        </div>
                        <p>{note.content}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel compact-panel">
                  <p className="panel-kicker">OBSERVAÇÃO</p>
                  <p>{selected.observation}</p>
                </article>

                <article className="panel compact-panel">
                  <div className="side-heading"><h3>Histórico</h3><span>{selected.history.length}</span></div>
                  <div className="history-list">
                    {selected.history.slice(0, 8).map((event) => (
                      <div key={event.id} className="history-item">
                        <span />
                        <div><p>{event.label}</p><small>{formatDate(event.createdAt)}</small></div>
                      </div>
                    ))}
                  </div>
                </article>
              </aside>
            </section>
          </>
        )}
      </section>

      {isCreatingTrack && (
        <NewTrackModal
          saving={saving}
          onClose={() => setIsCreatingTrack(false)}
          onSave={async (track) => {
            const ok = await saveAction({
              action: "create-track",
              track,
              author: "Almir",
            });
            if (ok) {
              setIsCreatingTrack(false);
              const response = await fetch("/api/pdi", { cache: "no-store" });
              const data = await response.json().catch(() => ({}));
              if (response.ok && data.tracks?.length) {
                setTracks(data.tracks);
                setSelectedId(data.tracks[data.tracks.length - 1].id);
              }
            }
          }}
        />
      )}

      {isDeadlineEditing && (
        <DeadlineModal
          track={selected}
          saving={saving}
          onClose={() => setIsDeadlineEditing(false)}
          onSave={async (deadline) => {
            const ok = await saveAction({
              action: "update-track",
              track: { ...selected, deadline },
              author: "Almir",
              label: "Prazo atualizado",
            });
            if (ok) setIsDeadlineEditing(false);
          }}
        />
      )}

      {isEditing && (
        <EditModal
          track={selected}
          saving={saving}
          onClose={() => setIsEditing(false)}
          onSave={async (next) => {
            const ok = await saveAction({
              action: "update-track",
              track: next,
              author: "Almir",
              label: "Planejamento atualizado",
            });
            if (ok) setIsEditing(false);
          }}
        />
      )}
    </main>
  );
}

function EditModal({
  track,
  saving,
  onClose,
  onSave,
}: {
  track: PdiTrack;
  saving: boolean;
  onClose: () => void;
  onSave: (track: PdiTrack) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(track);

  function field<K extends keyof PdiTrack>(key: K, value: PdiTrack[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div><p className="eyebrow">EDIÇÃO</p><h2>{draft.developmentPoint}</h2></div>
          <button className="close-button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="edit-form">
          <label>Ponto de desenvolvimento<input value={draft.developmentPoint} onChange={(e) => field("developmentPoint", e.target.value)} /></label>
          <label>Objetivo<textarea rows={3} value={draft.objective} onChange={(e) => field("objective", e.target.value)} /></label>
          <label>Ação<textarea rows={2} value={draft.action} onChange={(e) => field("action", e.target.value)} /></label>
          <label>Como executar<textarea rows={8} value={draft.how} onChange={(e) => field("how", e.target.value)} /></label>
          <label>Resultado esperado<textarea rows={4} value={draft.expectedResult} onChange={(e) => field("expectedResult", e.target.value)} /></label>
          <div className="two-columns">
            <label>Prazo<input value={draft.deadline} onChange={(e) => field("deadline", e.target.value)} /></label>
            <label>Status
              <select value={draft.status} onChange={(e) => field("status", e.target.value as PdiTrack["status"])}>
                <option>Não iniciado</option>
                <option>Em andamento</option>
                <option>Concluído</option>
              </select>
            </label>
          </div>
          <label>
            Progresso: {draft.progress}%
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={draft.progress}
              onChange={(e) => field("progress", Number(e.target.value))}
            />
          </label>
          <label>Observação<textarea rows={3} value={draft.observation} onChange={(e) => field("observation", e.target.value)} /></label>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="primary-button compact" onClick={() => onSave(draft)} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}


function toInputDate(value: string) {
  const [day, month, year] = value.split("/");
  if (!day || !month || !year) return "";
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function fromInputDate(value: string) {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function extractDeadlineDates(deadline: string) {
  const dates = deadline.match(/\d{2}\/\d{2}\/\d{4}/g) ?? [];
  return {
    start: dates[0] ? toInputDate(dates[0]) : "",
    end: dates[1] ? toInputDate(dates[1]) : "",
  };
}

function DeadlineModal({
  track,
  saving,
  onClose,
  onSave,
}: {
  track: PdiTrack;
  saving: boolean;
  onClose: () => void;
  onSave: (deadline: string) => void | Promise<void>;
}) {
  const initial = extractDeadlineDates(track.deadline);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);

  function buildDeadline() {
    if (start && end) return `${fromInputDate(start)} → ${fromInputDate(end)}`;
    if (start) return `A partir de ${fromInputDate(start)}`;
    if (end) return `Até ${fromInputDate(end)}`;
    return "";
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card deadline-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">PRAZO</p>
            <h2>Editar período</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="edit-form">
          {track.deadline && !initial.start && (
            <div className="current-deadline-note">
              <span>Prazo atual</span>
              <strong>{track.deadline}</strong>
            </div>
          )}

          <div className="two-columns">
            <label>
              Data inicial
              <input
                type="date"
                value={start}
                onChange={(event) => setStart(event.target.value)}
              />
            </label>

            <label>
              Data final
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </div>

          <div className="deadline-preview">
            <span>Novo prazo</span>
            <strong>{buildDeadline() || "Nenhuma data selecionada"}</strong>
          </div>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="primary-button compact"
            onClick={() => onSave(buildDeadline())}
            disabled={saving || (!start && !end)}
          >
            {saving ? "Salvando..." : "Salvar prazo"}
          </button>
        </div>
      </div>
    </div>
  );
}


function NewTrackModal({
  saving,
  onClose,
  onSave,
}: {
  saving: boolean;
  onClose: () => void;
  onSave: (track: {
    developmentPoint: string;
    objective: string;
    action: string;
    how: string;
    expectedResult: string;
    deadline: string;
    observation: string;
    progress: number;
    status: PdiTrack["status"];
  }) => void | Promise<void>;
}) {
  const [developmentPoint, setDevelopmentPoint] = useState("");
  const [objective, setObjective] = useState("");
  const [action, setAction] = useState("");
  const [how, setHow] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [observation, setObservation] = useState("");
  const [status, setStatus] = useState<PdiTrack["status"]>("Não iniciado");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  function deadline() {
    if (start && end) return `${fromInputDate(start)} → ${fromInputDate(end)}`;
    if (start) return `A partir de ${fromInputDate(start)}`;
    if (end) return `Até ${fromInputDate(end)}`;
    return "";
  }

  const canSave = developmentPoint.trim() && objective.trim();

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <p className="eyebrow">NOVA TRILHA</p>
            <h2>Criar trilha de desenvolvimento</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="edit-form">
          <label>
            Nome da trilha
            <input
              value={developmentPoint}
              onChange={(event) => setDevelopmentPoint(event.target.value)}
              placeholder="Ex.: Direção Criativa"
              autoFocus
            />
          </label>

          <label>
            Objetivo
            <textarea
              rows={3}
              value={objective}
              onChange={(event) => setObjective(event.target.value)}
              placeholder="O que você quer desenvolver com essa trilha?"
            />
          </label>

          <label>
            Ação principal
            <textarea
              rows={2}
              value={action}
              onChange={(event) => setAction(event.target.value)}
              placeholder="Qual será a principal frente de ação?"
            />
          </label>

          <label>
            Como executar
            <textarea
              rows={6}
              value={how}
              onChange={(event) => setHow(event.target.value)}
              placeholder="Liste etapas, pessoas, estudos, práticas ou entregas."
            />
          </label>

          <label>
            Resultado esperado
            <textarea
              rows={3}
              value={expectedResult}
              onChange={(event) => setExpectedResult(event.target.value)}
              placeholder="Como você saberá que essa trilha gerou evolução?"
            />
          </label>

          <div className="two-columns">
            <label>
              Data inicial
              <input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
            </label>
            <label>
              Data final
              <input
                type="date"
                value={end}
                min={start || undefined}
                onChange={(event) => setEnd(event.target.value)}
              />
            </label>
          </div>

          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value as PdiTrack["status"])}>
              <option>Não iniciado</option>
              <option>Em andamento</option>
              <option>Concluído</option>
            </select>
          </label>

          <label>
            Observação
            <textarea
              rows={3}
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              placeholder="Contexto adicional, dependências ou observações."
            />
          </label>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button
            className="primary-button compact"
            disabled={!canSave || saving}
            onClick={() =>
              onSave({
                developmentPoint: developmentPoint.trim(),
                objective: objective.trim(),
                action: action.trim(),
                how: how.trim(),
                expectedResult: expectedResult.trim(),
                deadline: deadline(),
                observation: observation.trim(),
                progress: 0,
                status,
              })
            }
          >
            {saving ? "Criando..." : "Criar trilha"}
          </button>
        </div>
      </div>
    </div>
  );
}
