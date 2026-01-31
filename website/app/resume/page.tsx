'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { listResumes, createResume, deleteResume } from '@/lib/resume-api';
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

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);

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
  }, []);

  async function loadResumes() {
    try {
      const { resumes: data } = await listResumes();
      setResumes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateResume() {
    try {
      if (isGuest) {
        const resume = createGuestResume();
        router.push(`/resume/${resume.id}`);
      } else {
        const { resume } = await createResume();
        router.push(`/resume/${resume.id}`);
      }
    } catch (err: any) {
      setError(err.message);
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
        <div className={styles.headerLeft}>
          <Link href="/" className={styles.logo}>
            LTG <span>Vault</span>
          </Link>
        </div>
        <nav className={styles.nav}>
          <Link href="/postup.html">PostUp</Link>
          <Link href="/chaptergen.html">ChapterGen</Link>
          <Link href="/threadgen.html">ThreadGen</Link>
          <Link href="/resume" className={styles.active}>Resume</Link>
          <Link href="/dashboard.html">Dashboard</Link>
        </nav>
      </header>

      {/* Resume Sub-navigation */}
      <div className={styles.subNav}>
        <Link href="/resume" className={styles.subNavActive}>My Resumes</Link>
        <Link href="/resume/cover-letter">Cover Letters</Link>
        <Link href="/resume/jobs">Job Tracker</Link>
      </div>

      <main className={styles.main}>
        {isGuest && (
          <div className={styles.guestBanner}>
            <span>You're in guest mode. Your resumes are saved locally.</span>
            <Link href="/pricing.html" className={styles.guestBannerLink}>
              Create free account to save online
            </Link>
          </div>
        )}

        <div className={styles.titleRow}>
          <h1>My Resumes</h1>
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
            <h2>No resumes yet</h2>
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
      </main>
    </div>
  );
}
