'use client';

import { useRouter } from 'next/navigation';
import styles from './UpgradeModal.module.css';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  title = 'Upgrade to Pro',
  message = 'Unlock unlimited access with Resume Builder Pro.',
  feature = 'this feature'
}: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  async function handleUpgrade() {
    try {
      const apiKey = localStorage.getItem('ltgv_api_key');
      if (!apiKey) {
        // Not logged in - redirect to pricing
        window.location.href = '/pricing.html';
        return;
      }

      // Create checkout session
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ tool: 'resumebuilder' })
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      // Fallback to pricing page
      window.location.href = '/pricing.html';
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.icon}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
        </div>

        <h2 className={styles.title}>{title}</h2>
        <p className={styles.message}>{message}</p>

        <div className={styles.freeInfo}>
          <span>Free tier includes:</span>
          <span>1 resume • 5 AI generations • Clean template</span>
        </div>

        <div className={styles.features}>
          <div className={styles.feature}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Unlimited resumes</span>
          </div>
          <div className={styles.feature}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>All premium templates</span>
          </div>
          <div className={styles.feature}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>100 AI generations/month</span>
          </div>
          <div className={styles.feature}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Unlimited cover letters & job tracking</span>
          </div>
        </div>

        <div className={styles.pricing}>
          <span className={styles.price}>$19</span>
          <span className={styles.period}>one-time payment</span>
        </div>

        <button className={styles.upgradeButton} onClick={handleUpgrade}>
          Upgrade to Pro
        </button>

        <p className={styles.note}>Lifetime access. No subscription.</p>
      </div>
    </div>
  );
}
