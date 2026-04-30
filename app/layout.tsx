import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Navigation } from "@/components/layout/Navigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Høst – Ulven Park Samdyrkerlag",
  description: "Ukentlig høsteoversikt for Ulven Park samdyrkerlag i Oslo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
