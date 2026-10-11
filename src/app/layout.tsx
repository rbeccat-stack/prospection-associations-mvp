import type { Metadata } from "next";
import "./globals.css";
import "./dossier.css";
import "./discovery.css";
import "./opportunities.css";

export const metadata: Metadata = {
  title: "Dossier du jour — Prospection d’associations",
  description: "Cockpit personnel de prospection sourcée",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
