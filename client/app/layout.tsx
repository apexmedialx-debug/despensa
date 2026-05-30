import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import { ReactQueryProvider } from '@/context/QueryProvider'
import { Toaster } from 'react-hot-toast'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Despensa — Gestor de Inventário',
  description: 'Gere a despensa da tua casa, listas de compras e gastos familiares',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Despensa',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#007AFF',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className="bg-background">
      <body className={`${geist.className} antialiased bg-background`}>
        <ReactQueryProvider>
          <AuthProvider>
            {children}
            <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  )
}
