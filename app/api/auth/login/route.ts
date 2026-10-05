import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  const configuredUsername = process.env.APP_ACCESS_USERNAME || "almir";
  const configuredPassword = process.env.APP_ACCESS_PASSWORD;

  if (!configuredPassword) {
    return NextResponse.json(
      { message: "O acesso ainda não foi configurado no servidor." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (username.toLowerCase() !== configuredUsername.toLowerCase() || password !== configuredPassword) {
    return NextResponse.json({ message: "Usuário ou senha incorretos." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(configuredPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return response;
}
