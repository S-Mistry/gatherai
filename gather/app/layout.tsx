import { Caveat, Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { Toaster } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const fontSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
})

const fontHand = Caveat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-hand",
})

const fontSans = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
})

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "antialiased",
        fontSerif.variable,
        fontHand.variable,
        fontSans.variable,
        fontMono.variable
      )}
    >
      <body>
        <Toaster>{children}</Toaster>
      </body>
    </html>
  )
}
