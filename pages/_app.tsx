import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session | null }>) {
  return (
    <SessionProvider session={session}>
      <div className={`${inter.variable} font-sans`}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}
