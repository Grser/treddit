import "./globals.css";

import { LocaleProvider } from "@/contexts/LocaleContext";

export const metadata = { title: "Treddit" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
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
