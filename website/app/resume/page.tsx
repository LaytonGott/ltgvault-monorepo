'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { listResumes, createResume, deleteResume } from '@/lib/resume-api';
import UpgradeModal from '@/components/UpgradeModal';
import styles from './resume.module.css';

interface Resume {
  id: string;
  title: string;
  template: string;
  updated_at: string;
}

// Guest mode helpers - store resumes in localStorage
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

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [proStatus, setProStatus] = useState<ProStatus | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  useEffect(() => {
    const apiKey = localStorage.getItem('ltgv_api_key');

    if (!apiKey) {
      // Guest mode - use localStorage
      setIsGuest(true);
      setResumes(getGuestResumes());
      setLoading(false);
      return;
    }

    loadResumes();
    loadProStatus();

    // Handle query params from redirects (e.g., from /resume/new)
    // Using window.location.search instead of useSearchParams to avoid SSR issues
    const params = new URLSearchParams(window.location.search);
    const limitParam = params.get('limit');
    const errorParam = params.get('error');

    if (limitParam === 'true') {
      setUpgradeMessage('You\'ve reached the free limit of 1 resume. Upgrade to Pro for unlimited resumes.');
      setShowUpgradeModal(true);
      // Clean up URL
      window.history.replaceState({}, '', '/resume');
    } else if (errorParam) {
      setError(errorParam);
      window.history.replaceState({}, '', '/resume');
    }
  }, []);

  async function loadProStatus() {
    try {
      const apiKey = localStorage.getItem('ltgv_api_key');
      if (!apiKey) {
        console.log('[Pro Status] No API key found');
        return;
      }

      console.log('[Pro Status] Fetching pro status...');
      const response = await fetch('/api/resume/pro-status', {
        headers: { 'x-api-key': apiKey }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Pro Status] Response:', JSON.stringify(data));
        setProStatus(data);
      } else {
        console.log('[Pro Status] Error response:', response.status);
      }
    } catch (err) {
      console.error('[Pro Status] Failed to load:', err);
    }
  }

  async function loadResumes() {
    try {
      const { resumes: data } = await listResumes();
      setResumes(data || []);
    } catch (err: any) {
      console.error('Failed to load resumes:', err);
      // If API fails (invalid key, server error, etc.), fall back to guest mode
      // This handles users with stale/invalid API keys gracefully
      if (err.status === 401 || err.status === 404) {
        console.log('API auth failed, clearing key and switching to guest mode');
        localStorage.removeItem('ltgv_api_key');
        setIsGuest(true);
        setResumes(getGuestResumes());
      } else {
        // Only show error for unexpected issues
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateResume() {
    console.log('[Create Resume] Starting...', { isGuest, isPro: proStatus?.isPro });

    try {
      if (isGuest) {
        // Guest mode: check local resumes limit (1 resume max for guests)
        const guestResumes = getGuestResumes();
        if (guestResumes.length >= 1) {
          setUpgradeMessage('Create a free account to save more resumes, or upgrade to Pro for unlimited resumes.');
          setShowUpgradeModal(true);
          return;
        }
        const resume = createGuestResume();
        router.push(`/resume/${resume.id}`);
      } else {
        // Logged in user - API handles the limit check
        console.log('[Create Resume] Calling API...');
        const { resume } = await createResume();
        console.log('[Create Resume] Success:', resume.id);
        router.push(`/resume/${resume.id}`);
      }
    } catch (err: any) {
      console.log('[Create Resume] Error:', err.code, err.message, err);
      // ONLY show upgrade modal for the specific RESUME_LIMIT error code
      // This ensures first-time users aren't blocked by other error types
      if (err.code === 'RESUME_LIMIT') {
        setUpgradeMessage('You\'ve reached the free limit of 1 resume. Upgrade to Pro for unlimited resumes.');
        setShowUpgradeModal(true);
        return;
      }
      // All other errors just show the error message
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
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            <img src="/logo.png" alt="LTG Vault" className={styles.logoImg} />
          </Link>
          <nav className={styles.nav}>
            <Link href="/postup.html">PostUp</Link>
            <Link href="/threadgen.html">ThreadGen</Link>
            <Link href="/chaptergen.html">ChapterGen</Link>
            <Link href="/resume" className={styles.active}>Resume</Link>
            <Link href="/pricing.html">Pricing</Link>
            <Link href="/dashboard.html">Dashboard</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {/* Pro Status Banner */}
        {proStatus?.isPro && (
          <div className={styles.proBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>Pro Active</span>
            <span className={styles.proBannerDetail}>Unlimited resumes · 100 AI/month</span>
          </div>
        )}

        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>Build your first resume in minutes</h1>
            <p className={styles.heroSubtitle}>AI-powered suggestions. Made for teens & first-time job seekers.</p>
            <button onClick={handleCreateResume} className={styles.heroButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Create Your Resume
            </button>
          </div>
          <div className={styles.heroPreview}>
            <div className={styles.resumeMockup}>
              <div className={styles.mockupHeader}>
                <h2 className={styles.mockupName}>Alex Johnson</h2>
                <p className={styles.mockupContact}>alexjohnson@email.com • (555) 123-4567 • Portland, OR</p>
              </div>

              <div className={styles.mockupSection}>
                <h3 className={styles.mockupSectionTitle}>Experience</h3>
                <div className={styles.mockupJob}>
                  <div className={styles.mockupJobHeader}>
                    <strong>Sales Associate</strong>
                    <span>Target • 2023 - Present</span>
                  </div>
                  <ul className={styles.mockupBullets}>
                    <li>Exceeded monthly sales targets by 15% through personalized customer recommendations</li>
                    <li>Trained 5 new team members on POS systems and store policies</li>
                    <li>Maintained organized merchandise displays, improving department presentation</li>
                  </ul>
                </div>
              </div>

              <div className={styles.mockupSection}>
                <h3 className={styles.mockupSectionTitle}>Education</h3>
                <div className={styles.mockupEducation}>
                  <strong>Lincoln High School</strong>
                  <span>Expected Graduation: June 2025 • GPA: 3.7</span>
                </div>
              </div>

              <div className={styles.mockupSection}>
                <h3 className={styles.mockupSectionTitle}>Skills</h3>
                <p className={styles.mockupSkills}>Customer Service • Cash Handling • Inventory Management • Microsoft Office • Teamwork • Problem Solving</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>Everything you need to land the job</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
              <h3>AI Bullet Points</h3>
              <p>Describe what you did, we make it sound professional. Turn "helped customers" into interview-winning achievements.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18"/>
                  <path d="M9 21V9"/>
                </svg>
              </div>
              <h3>Multiple Templates</h3>
              <p>Clean, modern designs that actually get interviews. No flashy gimmicks - just what hiring managers want to see.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <h3>Cover Letters</h3>
              <p>Generate tailored cover letters for each job application. Just paste the job description and let AI do the rest.</p>
            </div>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
              </div>
              <h3>Job Tracker</h3>
              <p>Keep track of everywhere you've applied. Never lose track of a follow-up or miss a deadline again.</p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className={styles.howItWorks}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNumber}>1</div>
              <h3>Fill in your info</h3>
              <p>Add your experience, education, and skills. No experience? No problem - we'll help you highlight what matters.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>2</div>
              <h3>Let AI enhance it</h3>
              <p>Click a button to transform basic descriptions into powerful bullet points that grab attention.</p>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNumber}>3</div>
              <h3>Download and apply</h3>
              <p>Export your polished resume as a PDF. Start applying to jobs today.</p>
            </div>
          </div>
        </section>

        {/* Pricing Callout */}
        <section className={styles.pricingCallout}>
          <div className={styles.pricingCard}>
            <div className={styles.pricingBadge}>Lifetime Access</div>
            <div className={styles.pricingMain}>
              <span className={styles.pricingAmount}>$19</span>
              <span className={styles.pricingPeriod}>one-time</span>
            </div>
            <ul className={styles.pricingFeatures}>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                5 free AI generations to start
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                100 AI generations/month with Pro
              </li>
              <li>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Unlimited resumes & cover letters
              </li>
            </ul>
            <button onClick={handleCreateResume} className={styles.pricingButton}>
              Start Free - No Card Required
            </button>
          </div>
        </section>

        {/* My Resumes Section */}
        <section className={styles.resumesSection}>
          {isGuest && (
            <div className={styles.guestBanner}>
              <span>You're in guest mode. Your resumes are saved locally.</span>
              <Link href="/pricing.html" className={styles.guestBannerLink}>
                Create free account to save online
              </Link>
            </div>
          )}

          <div className={styles.titleRow}>
            <h2>My Resumes</h2>
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
                    title="Delete resume"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onContinueFree={() => {
          // If user has a resume, navigate to it; otherwise stay on page
          if (resumes.length > 0) {
            router.push(`/resume/${resumes[0].id}`);
          }
        }}
        title="Upgrade to Pro"
        message={upgradeMessage}
      />
    </div>
  );
}
