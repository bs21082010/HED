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
      <head>
        <style>{`html,body{background-color:#0b1026;color-scheme:dark;margin:0}body{font-family:Inter,system-ui,sans-serif;color:#e2e8f0}body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(700px 400px at 85% -5%,rgba(56,189,248,.12),transparent 60%),radial-gradient(800px 500px at -10% 10%,rgba(99,102,241,.14),transparent 55%),radial-gradient(600px 400px at 50% 120%,rgba(236,72,153,.08),transparent 60%)}`}</style>
      </head>
      <body className={`${inter.className} bg-[#0b1026] text-slate-200`}>
        {children}
      </body>
    </html>
  );
}
