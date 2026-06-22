import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

/**
 * IMPORTANT: the title and description below must render verbatim as
 *   <title>Komari Monitor</title>
 *   <meta name="description" content="A simple server monitor tool."/>
 * Komari rewrites these exact strings server-side to the operator's custom
 * site title/description. Do not template or alter them. (See dev/theme.html.)
 */
export const metadata: Metadata = {
  title: "Komari Monitor",
  description: "A simple server monitor tool.",
};

// Runs before paint so the correct light/dark surface is shown immediately.
const PRE_PAINT_MODE = `(()=>{try{var a=localStorage.getItem("appearance")||"system";var d=a==="dark"||(a!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.setAttribute("data-mode",d?"dark":"light");r.style.colorScheme=d?"dark":"light";var s=localStorage.getItem("kumo-surface");r.setAttribute("data-surface",s==="glass"?"glass":"solid");var ac=localStorage.getItem("kumo-accent");}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-kumo-canvas text-kumo-default min-h-screen antialiased">
        <script dangerouslySetInnerHTML={{ __html: PRE_PAINT_MODE }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
