import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
    themeColor: "#ffffff",
};

export const metadata: Metadata = {
    title: "SIMDATA Kecamatan - Sistem Data Kecamatan & Kelurahan Kota Bogor",
    description: "Sistem Data Kecamatan & Kelurahan Kota Bogor - Portal Informasi Pemerintahan, Pendidikan, Kesehatan, dan Infrastruktur Terintegrasi.",
    applicationName: "SIMDATA Kecamatan",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "SIMDATA Kecamatan",
    },
    icons: {
        icon: "/favicon-32x32.png",
    },
    formatDetection: {
        telephone: false,
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="id">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossOrigin="anonymous"
                />
                <link
                    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
                    rel="stylesheet"
                />
            </head>
            <body>
                {children}
            </body>
        </html>
    );
}
