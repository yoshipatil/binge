import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import BottomNav from "@/components/BottomNav";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers session={session}>
          <NavBar />
          {/* pb-20 on mobile reserves space above the fixed BottomNav; cleared on md+ */}
          <main className="flex-1 pb-20 md:pb-0">
            {children}
          </main>
          {/* Footer only on desktop — bottom nav occupies that space on mobile */}
          <footer className="hidden border-t border-border/40 py-4 text-center text-xs text-muted-foreground md:block">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </footer>
          <BottomNav />
        </Providers>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#0e0e12",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#2563EB", secondary: "#fff" } },
            error:   { iconTheme: { primary: "#f43f5e", secondary: "#fff" } },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
