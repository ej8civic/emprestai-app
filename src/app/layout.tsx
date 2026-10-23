import type { Metadata, Viewport } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { TRPCProvider } from "@/lib/trpc";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EmpresTI", template: "%s · EmpresTI" },
  description: "Empréstimo de equipamentos internos. Quem está com o quê, sem planilha.",
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

// O nonce da CSP é por request; nada aqui pode ser pré-renderizado.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
