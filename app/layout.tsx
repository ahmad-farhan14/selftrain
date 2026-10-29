import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SelfTrain — Train for yourself",
  description: "Catat latihan, nutrisi, dan progres harianmu bersama SelfTrain.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
