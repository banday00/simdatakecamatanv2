import type { Metadata } from "next";
import { TenantProvider } from "@/lib/tenant/context";
import { AuthProvider } from "@/lib/auth/context";
import "./globals.css";

export const metadata: Metadata = {
    title: "SIDAKOTA - Sistem Data Kecamatan & Kelurahan Kota Bogor",
    description:
        "Dashboard data kecamatan dan kelurahan se-Kota Bogor. Informasi pemerintahan, kesehatan, pendidikan, ekonomi, infrastruktur, dan sosial.",
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
                <TenantProvider>
                    <AuthProvider>{children}</AuthProvider>
                </TenantProvider>
            </body>
        </html>
    );
}
