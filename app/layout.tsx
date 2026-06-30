import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PIS — Second Brain",
  description: "Personal Intelligence System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-black/10 dark:border-white/10">
          <div className="mx-auto flex w-full max-w-2xl items-center gap-5 px-4 py-3 text-sm">
            <span className="font-semibold tracking-tight">PIS</span>
            <Link href="/" className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
              Stream
            </Link>
            <Link href="/garden" className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
              Garden
            </Link>
            <Link href="/marshall" className="text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white">
              Marshall
            </Link>
          </div>
        </nav>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
