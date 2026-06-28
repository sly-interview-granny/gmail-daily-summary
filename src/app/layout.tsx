import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gmail Daily Summary",
  description: "AI-powered daily digest of your Gmail inbox",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <div className="relative min-h-screen">
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.12),transparent_55%)]"
          />
          <div className="relative">{children}</div>
        </div>
      </body>
    </html>
  );
}
