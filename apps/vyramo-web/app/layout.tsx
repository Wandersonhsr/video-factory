import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vyramo AI — Video Engine",
  description: "Find. Remodel. Sell. AI video generation engine.",
  applicationName: "Vyramo AI",
};

export const viewport: Viewport = {
  themeColor: "#090713",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
