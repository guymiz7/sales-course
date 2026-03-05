import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'קורס מכירות',
  description: 'פלטפורמת קורס מכירות מקצועי',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen bg-white text-gray-900">
        {children}
      </body>
    </html>
  )
}
