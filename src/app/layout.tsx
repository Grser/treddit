import "./globals.css";

export const metadata = { title: "Treddit" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-app text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
