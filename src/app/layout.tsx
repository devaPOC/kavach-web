import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic, Cairo, Amiri, Scheherazade_New, Tajawal } from "next/font/google";
import { NonceProvider } from "@/lib/security/nonce-provider";
import { LanguageProvider } from "@/lib/contexts/LanguageContext";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

const scheherazadeNew = Scheherazade_New({
  variable: "--font-scheherazade-new",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Kavach Dashboard",
  description: "Cyber security app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} ${cairo.variable} ${amiri.variable} ${scheherazadeNew.variable} ${tajawal.variable} antialiased`}
      >
        <NonceProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </NonceProvider>
      </body>
    </html>
  );
}
