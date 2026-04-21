import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DrawerLabels",
  description: "Print labels for workshop parts drawers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-[var(--color-primary)] text-white px-6 py-3 flex items-center gap-4 shadow">
          <a href="/" className="text-xl font-bold tracking-tight hover:opacity-90">
            DrawerLabels
          </a>
          <nav className="flex gap-4 text-sm">
            <a href="/" className="hover:underline">Parts</a>
            <a href="/scan" className="hover:underline">Scan</a>
            <a href="/parts/new" className="hover:underline">+ New part</a>
          </nav>
        </header>
        <main className="px-6 py-6 max-w-6xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
