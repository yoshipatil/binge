import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { Analytics } from "@vercel/analytics/next";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Binge",
  description: "Rank movies, TV shows, and documentaries.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Binge",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <NavBar />
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
