import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aurora SmartFreight | Control de despachos",
  description: "Registra despachos, controla el aforo y comunica cada viaje a las áreas responsables.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
