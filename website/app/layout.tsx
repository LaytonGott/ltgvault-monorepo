import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Resume Builder | LTG Vault',
  description: 'Build your first resume in minutes with AI-powered suggestions',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://buloxodfitxczyfmvxbu.supabase.co" />
        <link rel="dns-prefetch" href="https://buloxodfitxczyfmvxbu.supabase.co" />
      </head>
      <body className={inter.className}>
        <a href="#main-content" className="skipLink">
          Skip to main content
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
