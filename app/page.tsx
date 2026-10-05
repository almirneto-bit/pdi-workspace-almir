import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PdiWorkspace from "@/components/pdi-workspace";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";

export default async function Home() {
  const configuredPassword = process.env.APP_ACCESS_PASSWORD;

  if (configuredPassword) {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    const expectedSession = await createSessionToken(configuredPassword);

    if (session !== expectedSession) redirect("/login");
  }

  return <PdiWorkspace authConfigured={Boolean(configuredPassword)} />;
}
