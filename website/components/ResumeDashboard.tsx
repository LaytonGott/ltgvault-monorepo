'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { listResumes, createResume, deleteResume } from '@/lib/resume-api';
import { debugLog } from '@/lib/debug';
import UpgradeModal from '@/components/UpgradeModal';
import styles from '../app/resume/resume.module.css';

interface Resume {
  id: string;
  title: string;
  template: string;
  updated_at: string;
}

// Guest mode helpers
function getGuestResumes(): Resume[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('ltgv_guest_resumes');
  return data ? JSON.parse(data) : [];
}

function saveGuestResumes(resumes: Resume[]) {
  localStorage.setItem('ltgv_guest_resumes', JSON.stringify(resumes));
}

function createGuestResume(): Resume {
  const id = 'guest_' + Date.now();
  const resume: Resume = {
    id,
    title: 'Untitled Resume',
    template: 'clean',
    updated_at: new Date().toISOString()
  };
  const resumes = getGuestResumes();
  resumes.unshift(resume);
  saveGuestResumes(resumes);
  return resume;
}

function deleteGuestResume(id: string) {
  const resumes = getGuestResumes().filter(r => r.id !== id);
  saveGuestResumes(resumes);
}

interface ProStatus {
  isPro: boolean;
  usage: { resumes: number; jobs: number; aiGenerations: number };
  canCreateResume: boolean;
  aiLimit: number;
  aiRemaining: number;
}

export default function ResumeDashboard() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    let apiKey = localStorage.getItem('ltgv_api_key');
    const storedEmail = localStorage.getItem('ltgv_email');

    debugLog('Auth', 'Initializing, has API key:', !!apiKey, 'has email:', !!storedEmail);

    // If no API key but we have an email, try to sync
    if (!apiKey && storedEmail) {
      debugLog('Auth', 'Attempting sync');
      try {
        const response = await fetch('/api/activate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: storedEmail })
        });
        const data = await response.json();

        if (data.success && data.apiKey) {
          debugLog('Auth', 'Sync successful');
          localStorage.setItem('ltgv_api_key', data.apiKey);
          apiKey = data.apiKey;
        } else {
          debugLog('Auth', 'Sync failed');
        }
      } catch (err) {
        console.error('[Auth] Sync fetch failed:', err);
      }
    }

    if (!apiKey) {
      debugLog('Auth', 'Entering guest mode');
      setIsGuest(true);
      setResumes(getGuestResumes());
      setLoading(false);
      return;
    }

    debugLog('Auth', 'Loading user data');
    loadResumes();
    loadProStatus();

    // Handle query params from redirects
    const params = new URLSearchParams(window.location.search);
    const limitParam = params.get('limit');
    const errorParam = params.get('error');

    if (limitParam === 'true') {
      setUpgradeMessage('You\'ve reached the free limit of 1 resume. Upgrade to Pro for unlimited resumes.');
      setShowUpgradeModal(true);
      window.history.replaceState({}, '', '/resume');
    } else if (errorParam) {
      setError(errorParam);
      window.history.replaceState({}, '', '/resume');
    }
  }

  async function loadProStatus() {
    try {
      const apiKey = localStorage.getItem('ltgv_api_key');
      if (!apiKey) return;

      const response = await fetch('/api/resume/status', {
        headers: { 'x-api-key': apiKey }
      });

      if (response.ok) {
        const data = await response.json();
        debugLog('ProStatus', 'isPro:', data.isPro);
        setProStatus(data);
      }
    } catch (err) {
      console.error('Failed to load pro status:', err);
    }
  }

  async function loadResumes() {
    try {
      const { resumes: data } = await listResumes();
      setResumes(data || []);
    } catch (err: any) {
      console.error('Failed to load resumes:', err);
      if (err.status === 401 || err.status === 404) {
        localStorage.removeItem('ltgv_api_key');
        setIsGuest(true);
        setResumes(getGuestResumes());
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateResume() {
    debugLog('Create', 'isGuest:', isGuest, 'isPro:', proStatus?.isPro);

    try {
      if (isGuest) {
        const guestResumes = getGuestResumes();
        if (guestResumes.length >= 1) {
          setUpgradeMessage('Create a free account to save more resumes, or upgrade to Pro for unlimited resumes.');
          setShowUpgradeModal(true);
          return;
        }
        const resume = createGuestResume();
        router.push(`/resume/${resume.id}`);
      } else {
        const result = await createResume();
        router.push(`/resume/${result.resume.id}`);
      }
    } catch (err: any) {
      debugLog('Create', 'Failed:', err.code, err.message);

      if (proStatus?.isPro && err.code === 'RESUME_LIMIT') {
        console.error('BUG: Pro user got RESUME_LIMIT');
        await loadProStatus();
        setError('Something went wrong. Please try again.');
        return;
      }

      if (err.code === 'RESUME_LIMIT') {
        setUpgradeMessage('You\'ve reached the free limit of 1 resume. Upgrade to Pro for unlimited resumes.');
        setShowUpgradeModal(true);
        return;
      }

      setError(err.message || 'Failed to create resume');
    }
  }

  async function handleDeleteResume(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Delete this resume?')) return;

    try {
      if (isGuest) {
        deleteGuestResume(id);
        setResumes(resumes.filter(r => r.id !== id));
      } else {
        await deleteResume(id);
        setResumes(resumes.filter(r => r.id !== id));
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <section className={styles.resumesSection}>
        <div className={styles.loading}>Loading your resumes...</div>
      </section>
    );
  }

  return (
    <>
      {/* Pro Status Banner */}
      {proStatus?.isPro && (
        <div className={styles.proBanner}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Pro Active</span>
          <span className={styles.proBannerDetail}>Unlimited resumes &middot; 100 AI/month</span>
        </div>
      )}

      <section className={styles.resumesSection} id="my-resumes" aria-labelledby="my-resumes-title">
        {isGuest && (
          <div className={styles.guestBanner}>
            <span>You&apos;re in guest mode. Your resumes are saved locally.</span>
            <Link href="/dashboard.html" className={styles.guestBannerLink}>
              Already subscribed? Sync your account &rarr;
            </Link>
          </div>
        )}

        <div className={styles.titleRow}>
          <h2 id="my-resumes-title">My Resumes</h2>
          {proStatus && (
            <div className={styles.usageIndicator}>
              <span className={styles.usageText}>
                {proStatus.isPro ? (
                  <>Pro: {proStatus.aiRemaining}/{proStatus.aiLimit} AI generations this month</>
                ) : (
                  <>{proStatus.aiRemaining}/{proStatus.aiLimit} AI generations remaining</>
                )}
              </span>
              {!proStatus.isPro && (
                <button onClick={() => { setUpgradeMessage('Get unlimited resumes, all templates, and 100 AI generations per month.'); setShowUpgradeModal(true); }} className={styles.upgradeLink}>
                  Upgrade
                </button>
              )}
            </div>
          )}
          <button onClick={handleCreateResume} className={styles.newButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Resume
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div aria-live="polite" aria-busy={loading}>
          {resumes.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
              </div>
              <h3>No resumes yet</h3>
              <p>Create your first resume to get started</p>
              <button onClick={handleCreateResume} className={styles.newButton}>
                Create Resume
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {resumes.map((resume) => (
                <Link href={`/resume/${resume.id}`} key={resume.id} className={styles.card}>
                  <div className={styles.cardPreview}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                  <div className={styles.cardInfo}>
                    <h3>{resume.title}</h3>
                    <p>Updated {new Date(resume.updated_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteResume(resume.id, e)}
                    className={styles.deleteButton}
                    title={`Delete ${resume.title || 'Untitled Resume'}`}
                    aria-label={`Delete resume: ${resume.title || 'Untitled Resume'}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onContinueFree={() => {
          if (resumes.length > 0) {
            router.push(`/resume/${resumes[0].id}`);
          }
        }}
        title="Upgrade to Pro"
        message={upgradeMessage}
      />
    </>
  );
}
