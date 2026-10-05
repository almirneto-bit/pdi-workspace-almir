import { cookies } from "next/headers";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export async function isWorkspaceAuthenticated() {
  const password = process.env.APP_ACCESS_PASSWORD;
  if (!password) return false;

  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  const expected = await createSessionToken(password);

  return session === expected;
}
