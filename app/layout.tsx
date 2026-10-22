import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SelfTrain — Train for yourself",
  description: "A simple home for your workouts and daily nutrition.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
