import type { Metadata } from "next";
import { Providers } from "../src/components/providers";
import "./globals.css";
export const metadata: Metadata = { title: { default: "Stay Focused", template: "%s · Stay Focused" }, description: "Your coursework, schedule, and study materials, together." };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en" suppressHydrationWarning><body><Providers>{children}</Providers></body></html>; }
