'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './jobs.module.css';

interface Job {
  id: string;
  company: string;
  title: string;
  url: string | null;
  status: string;
  notes: string | null;
  applied_date: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  { value: 'saved', label: 'Saved', color: '#6b7280' },
  { value: 'applied', label: 'Applied', color: '#3b82f6' },
  { value: 'interview', label: 'Interview', color: '#8b5cf6' },
  { value: 'offer', label: 'Offer', color: '#22c55e' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444' }
];

export default function JobTrackerPage() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formCompany, setFormCompany] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formStatus, setFormStatus] = useState('saved');
  const [formNotes, setFormNotes] = useState('');
  const [formAppliedDate, setFormAppliedDate] = useState('');
  const [formDeadline, setFormDeadline] = useState('');

  useEffect(() => {
    loadJobs();
  }, []);

  function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const apiKey = localStorage.getItem('ltgv_api_key');
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    return headers;
  }

  async function loadJobs() {
    try {
      const response = await fetch('/api/resume/jobs', { headers: getHeaders() });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load jobs');
      }

      setJobs(data.jobs || []);
    } catch (err: any) {
      console.error('Load jobs error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingJob(null);
    setFormCompany('');
    setFormTitle('');
    setFormUrl('');
    setFormStatus('saved');
    setFormNotes('');
    setFormAppliedDate('');
    setFormDeadline('');
    setModalOpen(true);
  }

  function openEditModal(job: Job) {
    setEditingJob(job);
    setFormCompany(job.company);
    setFormTitle(job.title);
    setFormUrl(job.url || '');
    setFormStatus(job.status);
    setFormNotes(job.notes || '');
    setFormAppliedDate(job.applied_date || '');
    setFormDeadline(job.deadline || '');
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingJob(null);
    setError(null);
  }

  async function handleSave() {
    if (!formCompany.trim() || !formTitle.trim()) {
      setError('Company and job title are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        company: formCompany,
        title: formTitle,
        url: formUrl || null,
        status: formStatus,
        notes: formNotes || null,
        appliedDate: formAppliedDate || null,
        deadline: formDeadline || null
      };

      if (editingJob) {
        // Update existing
        await fetch(`/api/resume/jobs/${editingJob.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });

        setJobs(prev => prev.map(j =>
          j.id === editingJob.id
            ? { ...j, ...payload, applied_date: payload.appliedDate, updated_at: new Date().toISOString() }
            : j
        ));
      } else {
        // Create new
        const response = await fetch('/api/resume/jobs', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.job) {
          setJobs(prev => [data.job, ...prev]);
        }
      }

      closeModal();
    } catch (err: any) {
      console.error('Save job error:', err);
      setError(err.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this job application?')) return;

    try {
      await fetch(`/api/resume/jobs/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      setJobs(prev => prev.filter(j => j.id !== id));
    } catch (err) {
      console.error('Delete job error:', err);
    }
  }

  async function handleStatusChange(job: Job, newStatus: string) {
    try {
      await fetch(`/api/resume/jobs/${job.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status: newStatus })
      });

      setJobs(prev => prev.map(j =>
        j.id === job.id ? { ...j, status: newStatus } : j
      ));
    } catch (err) {
      console.error('Update status error:', err);
    }
  }

  function getStatusStyle(status: string) {
    const option = STATUS_OPTIONS.find(s => s.value === status);
    return { backgroundColor: option?.color || '#6b7280' };
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
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
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Link href="/resume" className={styles.backButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1>Job Tracker</h1>
          <span className={styles.jobCount}>{jobs.length} jobs</span>
        </div>
        <nav className={styles.subNav}>
          <Link href="/resume">Resumes</Link>
          <Link href="/resume/cover-letter">Cover Letters</Link>
          <Link href="/resume/jobs" className={styles.subNavActive}>Job Tracker</Link>
        </nav>
        <div className={styles.topBarRight}>
          <button onClick={openAddModal} className={styles.addButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Job
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {jobs.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📋</div>
            <h3>No Jobs Yet</h3>
            <p>Start tracking your job applications by clicking "Add Job"</p>
            <button onClick={openAddModal} className={styles.emptyButton}>
              Add Your First Job
            </button>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Job Title</th>
                  <th>Status</th>
                  <th>Applied</th>
                  <th>Deadline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map(job => (
                  <tr key={job.id}>
                    <td>
                      <div className={styles.companyCell}>
                        <strong>{job.company}</strong>
                        {job.url && (
                          <a href={job.url} target="_blank" rel="noopener noreferrer" className={styles.urlLink}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                    <td>{job.title}</td>
                    <td>
                      <select
                        value={job.status}
                        onChange={(e) => handleStatusChange(job, e.target.value)}
                        className={styles.statusSelect}
                        style={getStatusStyle(job.status)}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>{formatDate(job.applied_date)}</td>
                    <td>{formatDate(job.deadline)}</td>
                    <td>
                      <div className={styles.actions}>
                        <button onClick={() => openEditModal(job)} className={styles.editButton} title="Edit">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <Link
                          href={`/resume/cover-letter?company=${encodeURIComponent(job.company)}&title=${encodeURIComponent(job.title)}`}
                          className={styles.coverLetterButton}
                          title="Create Cover Letter"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                            <line x1="16" y1="13" x2="8" y2="13" />
                            <line x1="16" y1="17" x2="8" y2="17" />
                          </svg>
                        </Link>
                        <button onClick={() => handleDelete(job.id)} className={styles.deleteButton} title="Delete">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingJob ? 'Edit Job' : 'Add Job'}</h3>
              <button onClick={closeModal} className={styles.modalClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className={styles.modalBody}>
              {error && <div className={styles.modalError}>{error}</div>}

              <div className={styles.formGroup}>
                <label>Company *</label>
                <input
                  type="text"
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Target"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Job Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Retail Associate"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Job Posting URL</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Applied Date</label>
                  <input
                    type="date"
                    value={formAppliedDate}
                    onChange={(e) => setFormAppliedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Deadline</label>
                <input
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Any notes about this application..."
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={closeModal} className={styles.cancelButton}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className={styles.saveButton}>
                {saving ? 'Saving...' : (editingJob ? 'Save Changes' : 'Add Job')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
