'use client';

import { useState } from 'react';
import styles from './UpgradeModal.module.css';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueFree?: () => void;  // Callback when user chooses to continue with free
  title?: string;
  message?: string;
  feature?: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  onContinueFree,
  title = 'Choose Your Plan',
  message = 'You\'ve reached a free tier limit.',
  feature = 'this feature'
}: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleUpgrade() {
    setLoading(true);
    setError(null);

    try {
      const apiKey = localStorage.getItem('ltgv_api_key');
      if (!apiKey) {
        // Not logged in - redirect to dashboard to sign up first
        window.location.href = '/dashboard.html?upgrade=resumebuilder';
        return;
      }

      // Go directly to Stripe checkout
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
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  }

  function handleContinueFree() {
    if (onContinueFree) {
      onContinueFree();
    }
    onClose();
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.message}>{message}</p>
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        {/* Comparison Cards */}
        <div className={styles.comparison}>
          {/* Free Plan - Muted */}
          <div className={styles.planCard}>
            <div className={styles.planHeader}>
              <h3 className={styles.planName}>Free</h3>
              <div className={styles.planPrice}>
                <span className={styles.priceAmount}>$0</span>
              </div>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItemNegative}>
                <svg className={styles.xIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>1 resume only</span>
              </li>
              <li className={styles.featureItemNegative}>
                <svg className={styles.xIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>5 AI generations total</span>
              </li>
              <li className={styles.featureItemNegative}>
                <svg className={styles.xIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>Basic template only</span>
              </li>
              <li className={styles.featureItemNegative}>
                <svg className={styles.xIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>No cover letters</span>
              </li>
              <li className={styles.featureItemNegative}>
                <svg className={styles.xIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                <span>3 job applications max</span>
              </li>
            </ul>

            <button className={styles.freeButton} onClick={handleContinueFree} disabled={loading}>
              Continue with Free
            </button>
          </div>

          {/* Pro Plan - Highlighted */}
          <div className={`${styles.planCard} ${styles.proPlan}`}>
            {/* Sparkle effects */}
            <div className={styles.sparkle1}></div>
            <div className={styles.sparkle2}></div>
            <div className={styles.sparkle3}></div>

            <div className={styles.badge}>BEST VALUE</div>

            <div className={styles.planHeader}>
              <h3 className={styles.planNamePro}>Pro</h3>
              <div className={styles.planPricePro}>
                <span className={styles.priceAmountPro}>$19</span>
                <span className={styles.priceNote}>one-time</span>
              </div>
            </div>

            <ul className={styles.featureList}>
              <li className={styles.featureItemPositive}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Unlimited resumes</span>
              </li>
              <li className={styles.featureItemPositive}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>100 AI generations/month</span>
              </li>
              <li className={styles.featureItemPositive}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>All premium templates</span>
              </li>
              <li className={styles.featureItemPositive}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>AI cover letter generator</span>
              </li>
              <li className={styles.featureItemPositive}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Unlimited job tracking</span>
              </li>
              <li className={styles.featureItemPositive}>
                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Priority support</span>
              </li>
            </ul>

            <div className={styles.highlight}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              <span>Lifetime access • No subscription</span>
            </div>

            <button className={styles.proButton} onClick={handleUpgrade} disabled={loading}>
              {loading ? (
                'Loading...'
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  Upgrade to Pro - $19
                </>
              )}
            </button>

          </div>
        </div>
      </div>
    </div>
  );
}
