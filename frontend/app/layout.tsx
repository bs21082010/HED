import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sainik School Ambikapur · Dormitory Discipline System",
  description:
    "Digital dormitory discipline and alert system for Sainik School Ambikapur",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0b1026] text-slate-200`}>
        {children}
      </body>
    </html>
  );
}
