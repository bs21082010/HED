import type { Metadata } from "next";
import { Inter } from "next/font/google";

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
      <body className={`${inter.className} bg-slate-100 text-slate-900`}>
        {children}
      </body>
    </html>
  );
}
