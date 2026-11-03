import type { Metadata } from "next";
import "./globals.css";
import "./dossier.css";
import "./discovery.css";
import "./opportunities.css";
import "./editions.css";

export const metadata: Metadata = {
  title: "Swipe & Prospect — Candidatures spontanées",
  description: "Découvrir des entreprises et préparer des candidatures personnalisées",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}
