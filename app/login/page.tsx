"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
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
      body: JSON.stringify({ password }),
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
        <h1>Seu espaço de desenvolvimento.</h1>
        <p className="muted">Acesse o planejamento, registre evoluções e mantenha o histórico do seu PDI organizado.</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="password">Senha de acesso</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite a senha"
            autoFocus
          />
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" disabled={loading || !password}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}
