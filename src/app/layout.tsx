import "./globals.css";

import { LocaleProvider } from "@/contexts/LocaleContext";

export const metadata = { title: "Treddit" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-app text-foreground antialiased">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
