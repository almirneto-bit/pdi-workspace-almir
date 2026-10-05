import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDI Workspace · Almir",
  description: "Workspace de desenvolvimento profissional, acompanhamento e documentação de PDI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
