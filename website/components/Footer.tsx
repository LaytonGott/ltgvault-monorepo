import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <span className={styles.brandName}>LTG Vault</span>
            <p className={styles.brandTagline}>AI-powered tools for the next generation.</p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.linkGroup}>
              <h4>Products</h4>
              <Link href="/postup.html">PostUp</Link>
              <Link href="/threadgen.html">ThreadGen</Link>
              <Link href="/chaptergen.html">ChapterGen</Link>
              <Link href="/resume">Resume Builder</Link>
            </div>
            <div className={styles.linkGroup}>
              <h4>Company</h4>
              <Link href="/pricing.html">Pricing</Link>
              <a href="mailto:support@ltgvault.com">Contact</a>
              <Link href="/privacy">Privacy Policy</Link>
              <Link href="/terms">Terms of Service</Link>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>&copy; 2026 LTG Vault LLC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
