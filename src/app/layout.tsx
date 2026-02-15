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
