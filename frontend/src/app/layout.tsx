import type { Metadata, Viewport } from "next";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "NextStop.ai | The Ultimate AI Copilot",
  description: "A premium, modernized AI experience powered by NextStop.",
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-256.png", sizes: "256x256", type: "image/png" },
    ],
    apple: [
      {
        url: "/brand/apple-touch-icon.png",
        sizes: "150x150",
        type: "image/png",
      },
    ],
    shortcut: "/brand/icon-32.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark overflow-x-hidden">
      <body className="antialiased min-h-screen bg-black text-white w-full max-w-full overflow-x-hidden">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

