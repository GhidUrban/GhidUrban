import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";

import ClientAppShell from "./ClientAppShell";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "GhidUrban",
    description: "Descoperă locuri, evenimente și recomandări din orașul tău.",
    metadataBase: new URL("https://ghidurban.ro"),
    icons: {
        icon: "/icons/favighidurban.png",
        apple: "/apple-touch-icon.png",
    },
    openGraph: {
        title: "GhidUrban",
        description: "Descoperă locuri, evenimente și recomandări din orașul tău.",
        url: "https://ghidurban.ro",
        siteName: "GhidUrban",
        images: [
            {
                url: "/images/previewicon.png",
                width: 1200,
                height: 630,
                alt: "GhidUrban",
            },
        ],
        locale: "ro_RO",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "GhidUrban",
        description: "Descoperă locuri, evenimente și recomandări din orașul tău.",
        images: ["/images/previewicon.png"],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ro">
            <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
                <ClientAppShell>{children}</ClientAppShell>
            </body>
        </html>
    );
}
