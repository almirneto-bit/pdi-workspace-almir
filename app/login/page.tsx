"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("almir");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Não foi possível entrar.");
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark">PDI</div>
        <p className="eyebrow">PDI WORKSPACE</p>
        <h1>Desenvolvimento em movimento.</h1>
        <p className="muted">
          Entre para acessar o planejamento, registrar aprendizados, acompanhar progresso e documentar feedbacks.
        </p>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="username">
            Usuário
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Seu usuário"
              autoComplete="username"
              autoFocus
            />
          </label>

          <label htmlFor="password">
            Senha
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button login-submit" disabled={loading || !username || !password}>
            {loading ? "Entrando..." : "Acessar workspace"}
          </button>
        </form>

        <p className="login-footnote">
          Acesso privado · PDI Workspace
        </p>
      </section>
    </main>
  );
}
