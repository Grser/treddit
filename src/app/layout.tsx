import type { Metadata } from "next";
import "./globals.css";
import { headers } from "next/headers";

import { LocaleProvider } from "@/contexts/LocaleContext";

const SITE_URL = "https://anime.clawn.cat";
const PREVIEW_IMAGE = `${SITE_URL}/demo-reddit.png`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Treddit",
  description: "Comunidad social para descubrir, compartir y conversar sobre anime.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Treddit",
    description: "Comunidad social para descubrir, compartir y conversar sobre anime.",
    url: SITE_URL,
    siteName: "Treddit",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: PREVIEW_IMAGE,
        width: 1200,
        height: 630,
        alt: "Treddit - comunidad de anime",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Treddit",
    description: "Comunidad social para descubrir, compartir y conversar sobre anime.",
    images: [PREVIEW_IMAGE],
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(() => {
              try {
                const saved = localStorage.getItem("treddit-theme");
                const dark = saved ? saved === "dark" : true;
                document.documentElement.classList.toggle("dark", dark);
                const palette = localStorage.getItem("treddit-light-palette") || "official";
                document.documentElement.dataset.lightPalette = palette;

                const customRaw = localStorage.getItem("treddit-light-custom");
                if (customRaw) {
                  const custom = JSON.parse(customRaw);
                  if (custom && typeof custom === "object") {
                    if (typeof custom.app === "string") document.documentElement.style.setProperty("--custom-app", custom.app);
                    if (typeof custom.surface === "string") document.documentElement.style.setProperty("--custom-surface", custom.surface);
                    if (typeof custom.input === "string") document.documentElement.style.setProperty("--custom-input", custom.input);
                    if (typeof custom.border === "string") document.documentElement.style.setProperty("--custom-border", custom.border);
                    if (typeof custom.foreground === "string") document.documentElement.style.setProperty("--custom-foreground", custom.foreground);
                    if (typeof custom.brand === "string") document.documentElement.style.setProperty("--custom-brand", custom.brand);
                  }
                }
              } catch {}
            })();`,
          }}
        />
      </head>
      <body className="bg-app text-foreground antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
