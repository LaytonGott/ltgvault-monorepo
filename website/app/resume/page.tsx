import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import ResumeLanding from '@/components/ResumeLanding';
import ResumeDashboard from '@/components/ResumeDashboard';
import ResumeDashboardSkeleton from '@/components/ResumeDashboardSkeleton';
import MobileNav from '@/components/MobileNav';
import Footer from '@/components/Footer';
import styles from './resume.module.css';

export const metadata: Metadata = {
  title: 'AI Resume Builder for Teens & First-Time Job Seekers | LTG Vault',
  description: 'Build your first resume in minutes with AI-powered suggestions. Made for teens & first-time job seekers. Free to start, $19 lifetime.',
  openGraph: {
    title: 'AI Resume Builder for Teens | LTG Vault',
    description: 'Build your first resume in minutes with AI-powered bullet points.',
    url: 'https://www.ltgvault.com/resume',
    siteName: 'LTG Vault',
    images: [{ url: 'https://www.ltgvault.com/og-resume.png', width: 1200, height: 630 }],
    type: 'website',
  },
  alternates: { canonical: 'https://www.ltgvault.com/resume' },
};

const NAV_LINKS = [
  { href: '/postup.html', label: 'PostUp' },
  { href: '/threadgen.html', label: 'ThreadGen' },
  { href: '/chaptergen.html', label: 'ChapterGen' },
  { href: '/resume', label: 'Resume', active: true },
  { href: '/pricing.html', label: 'Pricing' },
  { href: '/dashboard.html', label: 'Dashboard' },
];

export default function ResumesPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'LTG Vault Resume Builder',
    applicationCategory: 'BusinessApplication',
    offers: { '@type': 'Offer', price: '19', priceCurrency: 'USD' },
    description: 'AI-powered resume builder for teens and first-time job seekers',
  };

  return (
    <div className={styles.container}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/logo.png"
              alt="LTG Vault"
              width={400}
              height={236}
              className={styles.logoImg}
              priority
            />
          </Link>
          <nav className={styles.nav} aria-label="Main navigation">
            <Link href="/postup.html">PostUp</Link>
            <Link href="/threadgen.html">ThreadGen</Link>
            <Link href="/chaptergen.html">ChapterGen</Link>
            <Link href="/resume" className={styles.active}>Resume</Link>
            <Link href="/pricing.html">Pricing</Link>
            <Link href="/dashboard.html">Dashboard</Link>
          </nav>
          <MobileNav links={NAV_LINKS} />
        </div>
      </header>

      <main className={styles.main} id="main-content">
        <ResumeLanding />

        <Suspense fallback={<ResumeDashboardSkeleton />}>
          <ResumeDashboard />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
