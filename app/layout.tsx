import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "LHC Netball Stats",
  description: "Match tracker",
};

export const viewport: Viewport = {
  themeColor: "#061429",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-navy-dark text-cream">{children}</body>
    </html>
  );
}
