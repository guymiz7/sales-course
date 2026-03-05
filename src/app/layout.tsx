import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'תמחור ומכירות עם גיא מיזינסקי',
  description: 'פלטפורמת קורס תמחור ומכירות עם גיא מיזינסקי',
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
