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
  viewportFit: "cover",
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
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
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
          <main className="flex-1 pb-[calc(80px+env(safe-area-inset-bottom))] md:pb-0">
            {children}
          </main>
          {/* Footer — TMDB attribution required by ToS, visible on all screen sizes */}
          <footer className="border-t border-white/5 pb-24 pt-3 text-center text-[11px] text-white/20 md:pb-4 md:pt-4 md:text-xs md:text-white/25">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
            {" · "}
            <a href="/privacy" className="underline-offset-2 hover:text-white/40 hover:underline">
              Privacy Policy
            </a>
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
