'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import UpgradeModal from '@/components/UpgradeModal';
import MobileNav from '@/components/MobileNav';
import Footer from '@/components/Footer';
import styles from './cover-letter.module.css';

const NAV_LINKS = [
  { href: '/postup.html', label: 'PostUp' },
  { href: '/threadgen.html', label: 'ThreadGen' },
  { href: '/chaptergen.html', label: 'ChapterGen' },
  { href: '/resume', label: 'Resume', active: true },
  { href: '/pricing.html', label: 'Pricing' },
  { href: '/dashboard.html', label: 'Dashboard' },
];

interface Resume {
  id: string;
  title: string;
}

interface CoverLetter {
  id: string;
  job_title: string;
  company: string;
  job_description: string;
  content: string;
  resume_id: string | null;
  created_at: string;
  updated_at: string;
}

// PDF Styles
const pdfStyles = StyleSheet.create({
  page: {
    padding: 60,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  date: {
    fontSize: 11,
    marginBottom: 20,
    color: '#333',
  },
  greeting: {
    marginBottom: 15,
  },
  paragraph: {
    marginBottom: 12,
    textAlign: 'justify' as const,
  },
  closing: {
    marginTop: 20,
  },
  signature: {
    marginTop: 40,
  },
});

// Cover Letter PDF Component
function CoverLetterPDF({ content, name }: { content: string; name: string }) {
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Split content into paragraphs
  const paragraphs = content.split('\n').filter(p => p.trim());

  return (
    <Document>
      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.date}>{today}</Text>
        {paragraphs.map((para, i) => (
          <Text key={i} style={pdfStyles.paragraph}>{para}</Text>
        ))}
        {name && <Text style={pdfStyles.signature}>{name}</Text>}
      </Page>
    </Document>
  );
}

export default function CoverLetterPage() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resumes, setResumes] = useState<Resume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // AI Usage State
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number; isPro: boolean; remaining: number } | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Form state
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [content, setContent] = useState('');
  const [userName, setUserName] = useState('');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadData();
    loadAIUsage();
  }, []);

  async function loadAIUsage() {
    try {
      // Use pro-status endpoint which includes AI usage data
      const response = await fetch('/api/resume/status', { headers: getHeaders() });
      if (response.ok) {
        const data = await response.json();
        // Transform pro-status response to ai-usage format
        setAiUsage({
          used: data.usage?.aiGenerations || 0,
          limit: data.aiLimit || 5,
          remaining: data.aiRemaining || 0,
          isPro: data.isPro || false
        });
        setIsPro(data.isPro || false);
      }
    } catch (err) {
      console.error('Failed to load AI usage:', err);
    }
  }

  async function loadData() {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const apiKey = localStorage.getItem('ltgv_api_key');
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      // Load resumes (from status endpoint) and cover letters in parallel
      const [statusRes, coverLettersRes] = await Promise.all([
        fetch('/api/resume/status', { headers }),
        fetch('/api/resume/cover-letters', { headers })
      ]);

      const statusData = await statusRes.json();
      const coverLettersData = await coverLettersRes.json();

      setResumes(statusData.resumes || []);
      setCoverLetters(coverLettersData.coverLetters || []);

      // If there's a resume, select it by default
      if (statusData.resumes?.length > 0) {
        setSelectedResumeId(statusData.resumes[0].id);
        // Try to get the user's name from the resume
        await loadUserName(statusData.resumes[0].id, headers);
      }
    } catch (err: any) {
      console.error('Load data error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserName(resumeId: string, headers: Record<string, string>) {
    try {
      const res = await fetch(`/api/resume/${resumeId}`, { headers });
      const data = await res.json();
      if (data.personalInfo) {
        const name = [data.personalInfo.first_name, data.personalInfo.last_name]
          .filter(Boolean).join(' ');
        setUserName(name);
      }
    } catch (err) {
      console.error('Load user name error:', err);
    }
  }

  function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = localStorage.getItem('ltgv_api_key');
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    return headers;
  }

  async function handleGenerate() {
    if (!jobTitle.trim() || !company.trim()) {
      setError('Please enter a job title and company');
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/resume/generate', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          type: 'cover-letter',
          jobTitle,
          company,
          jobDescription,
          resumeId: selectedResumeId || null
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'LIMIT_EXCEEDED') {
          setError(data.message);
          if (data.usage) {
            setAiUsage({ ...data.usage, remaining: data.usage.limit - data.usage.used });
          }
          setGenerating(false);
          return;
        }
        throw new Error(data.error || 'Failed to generate cover letter');
      }

      setContent(data.coverLetter);
      loadAIUsage(); // Refresh usage after successful generation

      // Auto-save
      if (currentId) {
        await saveCoverLetter(data.coverLetter);
      } else {
        await createCoverLetter(data.coverLetter);
      }
    } catch (err: any) {
      console.error('Generate error:', err);
      setError(err.message || 'Failed to generate cover letter');
    } finally {
      setGenerating(false);
    }
  }

  async function createCoverLetter(letterContent?: string) {
    try {
      const response = await fetch('/api/resume/cover-letters', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          resumeId: selectedResumeId || null,
          jobTitle,
          company,
          jobDescription,
          content: letterContent || content
        })
      });

      const data = await response.json();
      if (data.coverLetter) {
        setCurrentId(data.coverLetter.id);
        setCoverLetters(prev => [data.coverLetter, ...prev]);
      }
    } catch (err) {
      console.error('Create cover letter error:', err);
    }
  }

  async function saveCoverLetter(letterContent?: string) {
    if (!currentId) return;

    setSaving(true);
    try {
      await fetch(`/api/resume/cover-letters/${currentId}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          jobTitle,
          company,
          jobDescription,
          content: letterContent || content
        })
      });
    } catch (err) {
      console.error('Save cover letter error:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleContentChange(newContent: string) {
    setContent(newContent);

    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (currentId) {
      saveTimeoutRef.current = setTimeout(() => {
        saveCoverLetter(newContent);
      }, 1000);
    }
  }

  async function handleDownloadPDF() {
    if (!content.trim()) {
      setError('No cover letter content to download');
      return;
    }

    // Check if user is Pro
    if (!isPro) {
      setShowUpgradeModal(true);
      return;
    }

    setDownloading(true);
    try {
      const blob = await pdf(
        <CoverLetterPDF content={content} name={userName} />
      ).toBlob();

      const filename = company
        ? `Cover_Letter_${company.replace(/\s+/g, '_')}.pdf`
        : 'Cover_Letter.pdf';

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      setError('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  }

  function handleNewLetter() {
    setCurrentId(null);
    setJobTitle('');
    setCompany('');
    setJobDescription('');
    setContent('');
  }

  function handleLoadLetter(letter: CoverLetter) {
    setCurrentId(letter.id);
    setJobTitle(letter.job_title);
    setCompany(letter.company);
    setJobDescription(letter.job_description);
    setContent(letter.content);
    if (letter.resume_id) {
      setSelectedResumeId(letter.resume_id);
    }
  }

  async function handleDeleteLetter(id: string) {
    if (!confirm('Delete this cover letter?')) return;

    try {
      await fetch(`/api/resume/cover-letters/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      setCoverLetters(prev => prev.filter(l => l.id !== id));
      if (currentId === id) {
        handleNewLetter();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Main Header - matches other LTG Vault pages */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>
            <Image src="/logo.png" alt="LTG Vault" width={400} height={236} className={styles.logoImg} priority />
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

      {/* Page Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Link href="/resume" className={styles.backButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1>Cover Letter Generator</h1>
          {saving && <span className={styles.savingBadge}>Saving...</span>}
        </div>
        <div className={styles.toolbarRight}>
          <button onClick={handleNewLetter} className={styles.newButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || !content.trim()}
            className={styles.downloadButton}
            title={!isPro ? 'Pro feature - Upgrade to download' : ''}
          >
            {downloading ? 'Generating...' : (
              <>
                {!isPro && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
                Download PDF {!isPro && '(Pro)'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className={styles.mainLayout}>
        {/* Left Panel - Form */}
        <div className={styles.formPanel}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          {/* Previous Cover Letters */}
          {coverLetters.length > 0 && (
            <div className={styles.previousSection}>
              <h3>Previous Cover Letters</h3>
              <div className={styles.previousList}>
                {coverLetters.slice(0, 5).map(letter => (
                  <div
                    key={letter.id}
                    className={`${styles.previousItem} ${currentId === letter.id ? styles.active : ''}`}
                    onClick={() => handleLoadLetter(letter)}
                  >
                    <div className={styles.previousInfo}>
                      <strong>{letter.job_title || 'Untitled'}</strong>
                      <span>{letter.company || 'No company'}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteLetter(letter.id); }}
                      className={styles.deleteButton}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.formSection}>
            <h3>Job Details</h3>

            <div className={styles.formGroup}>
              <label>Use Resume</label>
              <select
                value={selectedResumeId}
                onChange={(e) => {
                  setSelectedResumeId(e.target.value);
                  if (e.target.value) {
                    loadUserName(e.target.value, getHeaders());
                  }
                }}
              >
                <option value="">None (generic letter)</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Job Title *</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Retail Associate"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Company *</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Target"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Job Description (optional)</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here for a more tailored cover letter..."
                rows={6}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !jobTitle.trim() || !company.trim()}
              className={styles.generateButton}
            >
              {generating ? (
                <>
                  <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Generate Cover Letter
                </>
              )}
            </button>

            {aiUsage && (
              <div className={styles.aiUsageInfo}>
                <span>
                  {aiUsage.isPro ? (
                    <>Pro: {aiUsage.remaining} of {aiUsage.limit} generations left this month</>
                  ) : (
                    <>{aiUsage.remaining} of {aiUsage.limit} free generations left</>
                  )}
                </span>
                <div className={styles.aiUsageBar}>
                  <div
                    className={styles.aiUsageFill}
                    style={{ width: `${(aiUsage.remaining / aiUsage.limit) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview/Editor */}
        <div className={styles.previewPanel}>
          {content ? (
            <div className={styles.letterContainer}>
              <div className={styles.letterHeader}>
                <span>Edit your cover letter below</span>
                {!isPro && (
                  <span className={styles.previewBadge}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Preview Only - Upgrade to Download
                  </span>
                )}
              </div>
              <textarea
                className={styles.letterEditor}
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Your cover letter will appear here..."
              />
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📝</div>
              <h3>No Cover Letter Yet</h3>
              <p>Fill in the job details and click "Generate Cover Letter" to create a personalized cover letter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade to Download"
        message="Download and copy cover letters with Resume Builder Pro."
      />
      <Footer />
    </div>
  );
}
