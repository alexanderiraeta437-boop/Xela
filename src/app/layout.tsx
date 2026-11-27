import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/layout/AuthProvider";
import { AndroidBackHandler } from "@/components/layout/AndroidBackHandler";

export const metadata: Metadata = {
  title: {
    default: "Xela | Combates 1 vs 1 en Tiempo Real",
    template: "%s | Xela",
  },
  description:
    "Arena de combate 2D side-view 1 vs 1 en tiempo real. Desafía a la IA o enfréntate a tus amigos mediante salas de 6 caracteres.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo/xela-logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  themeColor: "#050507",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#050507] font-sans text-white antialiased">
        <AuthProvider>
          <AndroidBackHandler />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
