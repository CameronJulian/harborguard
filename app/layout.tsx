import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
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
  title: "HarborGuard",
  description:
    "AI-powered fleet intelligence and operational command platform.",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="HarborGuard" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta
          name="apple-mobile-web-app-title"
          content="HarborGuard"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#0f172a" />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
      >
        {children}

        <Script id="harborguard-push-init">
          {`
            async function registerHarborGuardWorker() {
              if (!("serviceWorker" in navigator)) {
                return;
              }

              try {
                const registration =
                  await navigator.serviceWorker.register("/sw.js");

                console.log(
                  "HarborGuard service worker registered:",
                  registration
                );

                if ("Notification" in window) {
                  const permission =
                    await Notification.requestPermission();

                  console.log(
                    "Notification permission:",
                    permission
                  );
                }
              } catch (err) {
                console.error(
                  "Service worker registration failed:",
                  err
                );
              }
            }

            window.addEventListener(
              "load",
              registerHarborGuardWorker
            );
          `}
        </Script>
      </body>
    </html>
  );
}