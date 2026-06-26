import type { Metadata } from 'next'
import './globals.css'
import GlobalProgressBar from '../components/GlobalProgressBar'

export const metadata: Metadata = {
  title: 'Fresh-CAN Content Studio',
  description: 'AI-powered content automation dashboard for Fresh-CAN',
  icons: {
    icon: 'https://jbrktjnscnzmhwupojiu.supabase.co/storage/v1/object/public/assets/freshcan-logo-white.jpeg',
    shortcut: 'https://jbrktjnscnzmhwupojiu.supabase.co/storage/v1/object/public/assets/freshcan-logo-white.jpeg',
    apple: 'https://jbrktjnscnzmhwupojiu.supabase.co/storage/v1/object/public/assets/freshcan-logo-white.jpeg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="h-full bg-gray-50 font-sans">
        <GlobalProgressBar />
        {children}
      </body>
    </html>
  )
}
