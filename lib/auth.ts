export const SESSION_COOKIE = "pdi_workspace_session";

export async function createSessionToken(password: string) {
  const data = new TextEncoder().encode(`pdi-workspace-almir:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
