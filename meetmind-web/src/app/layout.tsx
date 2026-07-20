import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MeetMaxxing — AI Meeting Copilot",
  description:
    "AI-powered meeting intelligence: auto-summaries, action items, semantic memory, and real-time insights powered by Gemini.",
  keywords: ["meeting AI", "meeting notes", "action items", "Gemini AI"],
  openGraph: {
    title: "MeetMaxxing — AI Meeting Copilot",
    description: "AI-powered meeting intelligence powered by Gemini",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@400;500;700&family=Google+Sans+Display:wght@400;500;700&family=Google+Sans+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">{children}</body>
    </html>
  );
}
