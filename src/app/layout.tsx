import type { Metadata, Viewport } from 'next';
import { Prompt, Sarabun } from 'next/font/google';
import './globals.css';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-prompt',
  display: 'swap',
});

const sarabun = Sarabun({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FitLife Daily Tracker — คำนวณแคลอรี่ เมนูทั่วไป และตารางออกกำลังกาย',
  description:
    'เว็บแอปวางแผนแคลอรี่และโปรตีนตามกิจกรรมจริง คลังเมนูอาหารไทยทั่วไป และตารางฝึกพร้อมซิงก์คลาวด์ Supabase',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FitLife',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#10b981',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${prompt.variable} ${sarabun.variable}`} suppressHydrationWarning>
      <body className="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 min-h-screen antialiased transition-colors duration-200 overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
