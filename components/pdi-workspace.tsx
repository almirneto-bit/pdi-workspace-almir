"use client";

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from "react";
import { seedTracks } from "@/lib/seed";
import type { PdiTrack } from "@/types/pdi";

const STORAGE_KEY = "pdi-workspace-almir:v1";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function PdiWorkspace({ authConfigured }: { authConfigured: boolean }) {
  const [tracks, setTracks] = useState<PdiTrack[]>(seedTracks);
  const [selectedId, setSelectedId] = useState(seedTracks[0].id);
  const [isEditing, setIsEditing] = useState(false);
  const [newUpdate, setNewUpdate] = useState("");
  const [author, setAuthor] = useState("Almir");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTracks(JSON.parse(saved));
      } catch {
        setTracks(seedTracks);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
  }, [tracks, hydrated]);

  const selected = useMemo(
    () => tracks.find((track) => track.id === selectedId) ?? tracks[0],
    [tracks, selectedId],
  );

  const averageProgress = Math.round(
    tracks.reduce((total, track) => total + track.progress, 0) / Math.max(tracks.length, 1),
  );
  const totalUpdates = tracks.reduce((total, track) => total + track.updates.length, 0);
  const totalHistory = tracks.reduce((total, track) => total + track.history.length, 0);

  function updateTrack(next: PdiTrack, label = "Planejamento atualizado") {
    const withHistory: PdiTrack = {
      ...next,
      history: [
        {
          id: uid(),
          label,
          createdAt: new Date().toISOString(),
        },
        ...next.history,
      ],
    };

    setTracks((current) => current.map((track) => (track.id === withHistory.id ? withHistory : track)));
  }

  function handleUpdateSubmit(event: FormEvent) {
    event.preventDefault();
    if (!newUpdate.trim()) return;

    updateTrack(
      {
        ...selected,
        updates: [
          {
            id: uid(),
            author: author.trim() || "Almir",
            content: newUpdate.trim(),
            createdAt: new Date().toISOString(),
          },
          ...selected.updates,
        ],
      },
      `Nova atualização adicionada por ${author.trim() || "Almir"}`,
    );
    setNewUpdate("");
  }

  function resetLocalData() {
    if (!window.confirm("Restaurar os dados originais importados da planilha? As alterações locais serão apagadas.")) return;
    setTracks(seedTracks);
    setSelectedId(seedTracks[0].id);
    window.localStorage.removeItem(STORAGE_KEY);
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
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="storage-status">
            <span className="status-dot" />
            <div>
              <strong>V1 · Armazenamento local</strong>
              <span>Supabase entra na próxima etapa</span>
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
            <button className="ghost-button" onClick={resetLocalData}>Restaurar base</button>
            <button className="primary-button compact" onClick={() => setIsEditing(true)}>Editar trilha</button>
          </div>
        </header>

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
            <small>registros de evolução</small>
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
            <div className="progress-ring" style={{ "--progress": `${selected.progress * 3.6}deg` } as CSSProperties}>
              <div><strong>{selected.progress}%</strong><span>progresso</span></div>
            </div>
          </div>
        </section>

        <section className="main-grid">
          <div className="main-column">
            <article className="panel">
              <div className="panel-heading"><span>01</span><h3>Ação principal</h3></div>
              <p className="lead-copy">{selected.action}</p>
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
                <button className="primary-button compact" type="submit" disabled={!newUpdate.trim()}>Adicionar atualização</button>
              </form>

              <div className="timeline">
                {selected.updates.length === 0 ? (
                  <div className="empty-state">Nenhuma atualização registrada nesta trilha ainda.</div>
                ) : (
                  selected.updates.map((update) => (
                    <div className="timeline-item" key={update.id}>
                      <span className="timeline-dot" />
                      <div>
                        <div className="timeline-meta"><strong>{update.author}</strong><span>{formatDate(update.createdAt)}</span></div>
                        <p>{update.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>

          <aside className="side-column">
            <article className="panel compact-panel">
              <p className="panel-kicker">PRAZO</p>
              <strong className="deadline">{selected.deadline}</strong>
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
      </section>

      {isEditing && (
        <EditModal
          track={selected}
          onClose={() => setIsEditing(false)}
          onSave={(next) => {
            updateTrack(next);
            setIsEditing(false);
          }}
        />
      )}
    </main>
  );
}

function EditModal({ track, onClose, onSave }: { track: PdiTrack; onClose: () => void; onSave: (track: PdiTrack) => void }) {
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
            <label>Status<select value={draft.status} onChange={(e) => field("status", e.target.value as PdiTrack["status"])}><option>Não iniciado</option><option>Em andamento</option><option>Concluído</option></select></label>
          </div>
          <label>Progresso: {draft.progress}%<input type="range" min="0" max="100" step="5" value={draft.progress} onChange={(e) => field("progress", Number(e.target.value))} /></label>
          <label>Observação<textarea rows={3} value={draft.observation} onChange={(e) => field("observation", e.target.value)} /></label>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>Cancelar</button>
          <button className="primary-button compact" onClick={() => onSave(draft)}>Salvar alterações</button>
        </div>
      </div>
    </div>
  );
}
