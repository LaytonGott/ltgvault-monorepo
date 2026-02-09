'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { pdf } from '@react-pdf/renderer';
import { getResume, updateResume, updateSection, deleteFromSection } from '@/lib/resume-api';
import { debugLog } from '@/lib/debug';
import ResumePDF, { getResumeFilename } from '@/components/ResumePDF';
import UpgradeModal from '@/components/UpgradeModal';
import TemplateGallery from '@/components/TemplateGallery';
import { redirectToResumeProCheckout } from '@/lib/resume-checkout';
import { getTemplateConfig, getTemplate, LEGACY_TEMPLATE_MAP, COLOR_THEMES, ColorThemeId, getEffectiveColors, DEFAULT_TEMPLATE } from '@/lib/template-config';

// Get the effective template ID, resolving legacy mappings
function getEffectiveTemplateId(templateId: string | undefined): string {
  if (!templateId) return 'harvard';
  const mapped = LEGACY_TEMPLATE_MAP[templateId];
  return mapped || templateId;
}
import PhotoCropper from '@/components/PhotoCropper';
import styles from './editor.module.css';

// Guest mode storage helpers
function getGuestResumeData(resumeId: string) {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(`ltgv_guest_resume_${resumeId}`);
  return data ? JSON.parse(data) : null;
}

function saveGuestResumeData(resumeId: string, data: any) {
  localStorage.setItem(`ltgv_guest_resume_${resumeId}`, JSON.stringify(data));
  // Also update the resumes list
  const resumes = JSON.parse(localStorage.getItem('ltgv_guest_resumes') || '[]');
  const idx = resumes.findIndex((r: any) => r.id === resumeId);
  if (idx >= 0) {
    resumes[idx].updated_at = new Date().toISOString();
    resumes[idx].title = data.resume?.title || resumes[idx].title;
    localStorage.setItem('ltgv_guest_resumes', JSON.stringify(resumes));
  }
}

interface PersonalInfo {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  website_url?: string;
  summary?: string;
  photo_url?: string;
}

interface Education {
  id: string;
  school_name: string;
  degree?: string;
  field_of_study?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  gpa?: string;
  achievements?: string;
}

interface Experience {
  id: string;
  company_name: string;
  job_title: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  is_current: boolean;
  experience_type: string;
  description?: string;
}

interface Skill {
  id: string;
  skill_name: string;
}

interface Project {
  id: string;
  project_name: string;
  project_type: string;
  organization?: string;
  role?: string;
  description?: string;
}

interface Resume {
  id: string;
  title: string;
  template: string;
  color_theme?: string;
}

export default function ResumeEditorPage() {
  const params = useParams();
  const router = useRouter();
  const resumeId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const saveStatusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [resume, setResume] = useState<Resume | null>(null);
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({});
  const [education, setEducation] = useState<Education[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [openSections, setOpenSections] = useState<string[]>(['personal']);
  const [isGuest, setIsGuest] = useState(false);

  // AI Modal State (for bullets and summary)
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiModalMode, setAiModalMode] = useState<'bullets' | 'summary'>('bullets');
  const [aiModalTarget, setAiModalTarget] = useState<{ type: 'experience' | 'project'; id: string } | null>(null);
  const [aiDescription, setAiDescription] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedBullets, setAiGeneratedBullets] = useState<string | null>(null);
  const [aiGeneratedSummary, setAiGeneratedSummary] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // AI Usage State
  const [aiUsage, setAiUsage] = useState<{ used: number; limit: number; isPro: boolean; remaining: number } | null>(null);

  // Pro Status State
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');

  // Template Gallery State
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  // Color Dropdown State
  const [showColorDropdown, setShowColorDropdown] = useState(false);

  // Photo Cropper State
  const [showPhotoCropper, setShowPhotoCropper] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sectionSaveTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    const apiKey = localStorage.getItem('ltgv_api_key');
    const isGuestResume = resumeId.startsWith('guest_');

    if (isGuestResume) {
      setIsGuest(true);
      loadGuestResume();
    } else if (!apiKey) {
      window.location.href = '/dashboard.html';
      return;
    } else {
      loadResume();
      loadAIUsage();
    }
  }, [resumeId]);

  function loadGuestResume() {
    const data = getGuestResumeData(resumeId);
    if (data) {
      setResume(data.resume || { id: resumeId, title: 'Untitled Resume', template: DEFAULT_TEMPLATE });
      setPersonalInfo(data.personalInfo || {});
      setEducation(data.education || []);
      setExperience(data.experience || []);
      setSkills(data.skills || []);
      setProjects(data.projects || []);
    } else {
      // New guest resume
      setResume({ id: resumeId, title: 'Untitled Resume', template: DEFAULT_TEMPLATE });
    }
    setLoading(false);
  }

  function saveGuestData() {
    saveGuestResumeData(resumeId, {
      resume,
      personalInfo,
      education,
      experience,
      skills,
      projects
    });
  }

  async function loadAIUsage() {
    debugLog('loadAIUsage', 'Starting');
    try {
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
      };
      const apiKey = localStorage.getItem('ltgv_api_key');
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      // Use pro-status endpoint which includes AI usage data
      // Add timestamp to prevent browser caching
      const response = await fetch(`/api/resume/status?_t=${Date.now()}`, { headers, cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        debugLog('loadAIUsage', 'isPro:', data.isPro, 'aiRemaining:', data.aiRemaining);
        // Transform pro-status response to ai-usage format
        const newUsage = {
          used: data.usage?.aiGenerations || 0,
          limit: data.aiLimit || 5,
          remaining: data.aiRemaining || 0,
          isPro: data.isPro || false
        };
        setAiUsage(newUsage);
        setIsPro(data.isPro || false);
      }
    } catch (err) {
      console.error('Failed to load AI usage:', err);
    }
  }

  async function loadResume() {
    try {
      const data = await getResume(resumeId);
      setResume(data.resume);
      setPersonalInfo(data.personalInfo || {});
      setEducation(data.education || []);
      setExperience(data.experience || []);
      setSkills(data.skills || []);
      setProjects(data.projects || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Show saved status temporarily then reset to idle
  const showSavedStatus = useCallback(() => {
    setSaveStatus('saved');
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }
    saveStatusTimeoutRef.current = setTimeout(() => {
      setSaveStatus('idle');
    }, 2000);
  }, []);

  // Close color dropdown when clicking outside
  useEffect(() => {
    if (!showColorDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`.${styles.colorSelector}`)) {
        setShowColorDropdown(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showColorDropdown]);

  // Show error status temporarily then reset to idle
  const showErrorStatus = useCallback(() => {
    setSaveStatus('error');
    if (saveStatusTimeoutRef.current) {
      clearTimeout(saveStatusTimeoutRef.current);
    }
    saveStatusTimeoutRef.current = setTimeout(() => {
      setSaveStatus('idle');
    }, 3000);
  }, []);

  // Generic debounced save helper
  const debouncedSave = useCallback((key: string, saveFn: () => Promise<void>) => {
    if (sectionSaveTimeoutRef.current[key]) {
      clearTimeout(sectionSaveTimeoutRef.current[key]);
    }
    setSaveStatus('idle');
    sectionSaveTimeoutRef.current[key] = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        if (isGuest) {
          // Guest mode: save to localStorage
          saveGuestResumeData(resumeId, {
            resume,
            personalInfo,
            education,
            experience,
            skills,
            projects
          });
        } else {
          await saveFn();
        }
        showSavedStatus();
      } catch (err) {
        console.error('Save error:', err);
        showErrorStatus();
      }
    }, 1000);
  }, [showSavedStatus, showErrorStatus, isGuest, resumeId, resume, personalInfo, education, experience, skills, projects]);

  // Debounced save for personal info
  const savePersonalInfoDebounced = useCallback((data: PersonalInfo) => {
    debouncedSave('personalInfo', () => updateSection(resumeId, 'personalInfo', data));
  }, [resumeId, debouncedSave]);

  function updatePersonalField(field: string, value: string) {
    const updated = { ...personalInfo, [field]: value };
    setPersonalInfo(updated);
    savePersonalInfoDebounced(updated);
  }

  function handlePhotoSave(base64: string) {
    const updated = { ...personalInfo, photo_url: base64 };
    setPersonalInfo(updated);
    savePersonalInfoDebounced(updated);
  }

  function handlePhotoRemove() {
    const updated = { ...personalInfo, photo_url: undefined };
    setPersonalInfo(updated);
    savePersonalInfoDebounced(updated);
  }

  function handleUpdateResumeTitle(title: string) {
    if (!resume) return;
    const updatedResume = { ...resume, title };
    setResume(updatedResume);
    if (isGuest) {
      saveGuestResumeData(resumeId, { resume: updatedResume, personalInfo, education, experience, skills, projects });
    } else {
      debouncedSave('title', () => updateResume(resumeId, { title }));
    }
  }

  async function handleUpdateTemplate(template: string) {
    if (!resume) return;

    // Check if template is locked for free users
    const freeTemplates = ['clean', 'single-classic', 'single-harvard', 'single-jakes', 'harvard', 'jakes'];
    const templateConfig = getTemplateConfig(template);
    if (!isPro && templateConfig.isPro) {
      setUpgradeMessage('Unlock all premium templates with Resume Builder Pro.');
      setShowUpgradeModal(true);
      return;
    }

    const updatedResume = { ...resume, template };
    setResume(updatedResume);
    if (isGuest) {
      saveGuestResumeData(resumeId, { resume: updatedResume, personalInfo, education, experience, skills, projects });
      return;
    }
    setSaveStatus('saving');
    try {
      await updateResume(resumeId, { template });
      showSavedStatus();
    } catch (err: any) {
      // Handle template lock error from API
      if (err.message?.includes('TEMPLATE_LOCKED')) {
        setUpgradeMessage('Unlock all premium templates with Resume Builder Pro.');
        setShowUpgradeModal(true);
        setResume({ ...resume, template: DEFAULT_TEMPLATE }); // Revert to clean
        return;
      }
      console.error('Template update error:', err);
      showErrorStatus();
    }
  }

  async function handleUpdateColorTheme(colorTheme: string) {
    if (!resume) return;

    // Color themes are Pro-only (except 'default')
    if (!isPro && colorTheme !== 'default') {
      setUpgradeMessage('Unlock custom color themes with Resume Builder Pro.');
      setShowUpgradeModal(true);
      return;
    }

    const updatedResume = { ...resume, color_theme: colorTheme };
    setResume(updatedResume);
    if (isGuest) {
      saveGuestResumeData(resumeId, { resume: updatedResume, personalInfo, education, experience, skills, projects });
      return;
    }
    setSaveStatus('saving');
    try {
      await updateResume(resumeId, { color_theme: colorTheme });
      showSavedStatus();
    } catch (err) {
      console.error('Color theme update error:', err);
      showErrorStatus();
    }
  }

  function toggleSection(section: string) {
    setOpenSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  }

  // Education CRUD
  async function addEducation() {
    if (isGuest) {
      const newEdu: Education = {
        id: 'edu_' + Date.now(),
        school_name: '',
        is_current: false
      };
      const updated = [...education, newEdu];
      setEducation(updated);
      saveGuestResumeData(resumeId, { resume, personalInfo, education: updated, experience, skills, projects });
      return;
    }
    setSaveStatus('saving');
    try {
      await updateSection(resumeId, 'education', { school_name: '', sort_order: education.length });
      await loadResume(); // Reload to get new ID
      showSavedStatus();
    } catch (err) {
      console.error('Add education error:', err);
      showErrorStatus();
    }
  }

  function handleUpdateEducation(id: string, field: string, value: any) {
    setEducation(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    debouncedSave(`education-${id}-${field}`, () => updateSection(resumeId, 'education', { id, [field]: value }));
  }

  async function handleDeleteEducation(id: string) {
    const updated = education.filter(e => e.id !== id);
    setEducation(updated);
    if (isGuest) {
      saveGuestResumeData(resumeId, { resume, personalInfo, education: updated, experience, skills, projects });
      return;
    }
    setSaveStatus('saving');
    try {
      await deleteFromSection(resumeId, 'education', id);
      showSavedStatus();
    } catch (err) {
      console.error('Delete education error:', err);
      showErrorStatus();
    }
  }

  // Experience CRUD
  async function addExperience() {
    if (isGuest) {
      const newExp: Experience = {
        id: 'exp_' + Date.now(),
        company_name: '',
        job_title: '',
        is_current: false,
        experience_type: 'job'
      };
      const updated = [...experience, newExp];
      setExperience(updated);
      saveGuestResumeData(resumeId, { resume, personalInfo, education, experience: updated, skills, projects });
      return;
    }
    setSaveStatus('saving');
    try {
      await updateSection(resumeId, 'experience', { company_name: '', job_title: '', sort_order: experience.length });
      await loadResume();
      showSavedStatus();
    } catch (err) {
      console.error('Add experience error:', err);
      showErrorStatus();
    }
  }

  function handleUpdateExperience(id: string, field: string, value: any) {
    setExperience(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
    debouncedSave(`experience-${id}-${field}`, () => updateSection(resumeId, 'experience', { id, [field]: value }));
  }

  async function handleDeleteExperience(id: string) {
    const updated = experience.filter(e => e.id !== id);
    setExperience(updated);
    if (isGuest) {
      saveGuestResumeData(resumeId, { resume, personalInfo, education, experience: updated, skills, projects });
      return;
    }
    setSaveStatus('saving');
    try {
      await deleteFromSection(resumeId, 'experience', id);
      showSavedStatus();
    } catch (err) {
      console.error('Delete experience error:', err);
      showErrorStatus();
    }
  }

  // Skills CRUD
  async function addSkill() {
    if (isGuest) {
      const newSkill: Skill = {
        id: 'skill_' + Date.now(),
        skill_name: ''
      };
      const updated = [...skills, newSkill];
      setSkills(updated);
      saveGuestResumeData(resumeId, { resume, personalInfo, education, experience, skills: updated, projects });
      return;
    }
    setSaveStatus('saving');
    try {
      await updateSection(resumeId, 'skills', { skill_name: '', sort_order: skills.length });
      await loadResume();
      showSavedStatus();
    } catch (err) {
      console.error('Add skill error:', err);
      showErrorStatus();
    }
  }

  function handleUpdateSkill(id: string, value: string) {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, skill_name: value } : s));
    debouncedSave(`skill-${id}`, () => updateSection(resumeId, 'skills', { id, skill_name: value }));
  }

  async function handleDeleteSkill(id: string) {
    const updated = skills.filter(s => s.id !== id);
    setSkills(updated);
    if (isGuest) {
      saveGuestResumeData(resumeId, { resume, personalInfo, education, experience, skills: updated, projects });
      return;
    }
    setSaveStatus('saving');
    try {
      await deleteFromSection(resumeId, 'skills', id);
      showSavedStatus();
    } catch (err) {
      console.error('Delete skill error:', err);
      showErrorStatus();
    }
  }

  // Projects CRUD
  async function addProject() {
    if (isGuest) {
      const newProject: Project = {
        id: 'proj_' + Date.now(),
        project_name: '',
        project_type: 'project'
      };
      const updated = [...projects, newProject];
      setProjects(updated);
      saveGuestResumeData(resumeId, { resume, personalInfo, education, experience, skills, projects: updated });
      return;
    }
    setSaveStatus('saving');
    try {
      await updateSection(resumeId, 'projects', { project_name: '', sort_order: projects.length });
      await loadResume();
      showSavedStatus();
    } catch (err) {
      console.error('Add project error:', err);
      showErrorStatus();
    }
  }

  function handleUpdateProject(id: string, field: string, value: any) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    debouncedSave(`project-${id}-${field}`, () => updateSection(resumeId, 'projects', { id, [field]: value }));
  }

  async function handleDeleteProject(id: string) {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (isGuest) {
      saveGuestResumeData(resumeId, { resume, personalInfo, education, experience, skills, projects: updated });
      return;
    }
    setSaveStatus('saving');
    try {
      await deleteFromSection(resumeId, 'projects', id);
      showSavedStatus();
    } catch (err) {
      console.error('Delete project error:', err);
      showErrorStatus();
    }
  }

  // PDF Download
  async function handleDownloadPDF() {
    if (!resume) return;
    setDownloading(true);
    try {
      const blob = await pdf(
        <ResumePDF
          template={resume.template || 'single-classic'}
          colorTheme={resume.color_theme}
          personalInfo={personalInfo}
          education={education}
          experience={experience}
          skills={skills}
          projects={projects}
        />
      ).toBlob();

      const filename = getResumeFilename(personalInfo);
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

  // AI Modal Functions
  function openAiModal(type: 'experience' | 'project', id: string) {
    setAiModalMode('bullets');
    setAiModalTarget({ type, id });
    setAiDescription('');
    setAiGeneratedBullets(null);
    setAiGeneratedSummary(null);
    setAiError(null);
    setAiModalOpen(true);
  }

  function openSummaryModal() {
    setAiModalMode('summary');
    setAiModalTarget(null);
    setAiDescription('');
    setAiGeneratedBullets(null);
    setAiGeneratedSummary(null);
    setAiError(null);
    setAiModalOpen(true);
  }

  function closeAiModal() {
    setAiModalOpen(false);
    setAiModalMode('bullets');
    setAiModalTarget(null);
    setAiDescription('');
    setAiGeneratedBullets(null);
    setAiGeneratedSummary(null);
    setAiError(null);
  }

  async function handleGenerateBullets() {
    if (!aiDescription.trim()) {
      setAiError('Please describe what you did');
      return;
    }

    setAiGenerating(true);
    setAiError(null);

    try {
      // Get context from the target item
      let context = '';
      if (aiModalTarget?.type === 'experience') {
        const exp = experience.find(e => e.id === aiModalTarget.id);
        if (exp) {
          context = `Job: ${exp.job_title || 'Not specified'} at ${exp.company_name || 'Not specified'}`;
        }
      } else if (aiModalTarget?.type === 'project') {
        const proj = projects.find(p => p.id === aiModalTarget.id);
        if (proj) {
          context = `Project: ${proj.project_name || 'Not specified'}${proj.role ? `, Role: ${proj.role}` : ''}`;
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const apiKey = localStorage.getItem('ltgv_api_key');
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await fetch('/api/resume/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'bullets', description: aiDescription, context })
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'LIMIT_EXCEEDED') {
          setAiError(data.message);
          if (data.usage) {
            setAiUsage({ ...data.usage, remaining: data.usage.limit - data.usage.used });
          }
          return;
        }
        throw new Error(data.error || 'Failed to generate bullets');
      }

      setAiGeneratedBullets(data.bullets);
      // Update AI usage from response immediately (no need to re-fetch)
      if (data.aiUsage) {
        setAiUsage(data.aiUsage);
      }
    } catch (err: any) {
      console.error('Generate bullets error:', err);
      setAiError(err.message || 'Failed to generate bullets');
    } finally {
      setAiGenerating(false);
    }
  }

  function handleAcceptBullets() {
    if (!aiGeneratedBullets || !aiModalTarget) return;

    // Convert bullet format to plain text (remove leading dashes, join with newlines)
    const formattedBullets = aiGeneratedBullets
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.startsWith('-') ? line.substring(1).trim() : line)
      .map(line => `â€¢ ${line}`)
      .join('\n');

    if (aiModalTarget.type === 'experience') {
      const exp = experience.find(e => e.id === aiModalTarget.id);
      const existingDesc = exp?.description || '';
      const newDesc = existingDesc ? `${existingDesc}\n${formattedBullets}` : formattedBullets;
      handleUpdateExperience(aiModalTarget.id, 'description', newDesc);
    } else if (aiModalTarget.type === 'project') {
      const proj = projects.find(p => p.id === aiModalTarget.id);
      const existingDesc = proj?.description || '';
      const newDesc = existingDesc ? `${existingDesc}\n${formattedBullets}` : formattedBullets;
      handleUpdateProject(aiModalTarget.id, 'description', newDesc);
    }

    closeAiModal();
  }

  async function handleGenerateSummary() {
    setAiGenerating(true);
    setAiError(null);
    debugLog('generateSummary', 'Starting');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const apiKey = localStorage.getItem('ltgv_api_key');
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await fetch('/api/resume/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'summary', education, experience, skills, projects })
      });

      const data = await response.json();
      debugLog('generateSummary', 'Response status:', response.status);

      if (!response.ok) {
        if (data.error === 'LIMIT_EXCEEDED') {
          setAiError(data.message);
          if (data.usage) {
            setAiUsage({ ...data.usage, remaining: data.usage.limit - data.usage.used });
          }
          return;
        }
        throw new Error(data.error || 'Failed to generate summary');
      }

      setAiGeneratedSummary(data.summary);
      // Update AI usage from response immediately (no need to re-fetch)
      if (data.aiUsage) {
        setAiUsage(data.aiUsage);
      }
    } catch (err: any) {
      console.error('Generate summary error:', err);
      setAiError(err.message || 'Failed to generate summary');
    } finally {
      setAiGenerating(false);
    }
  }

  function handleAcceptSummary() {
    if (!aiGeneratedSummary) return;
    updatePersonalField('summary', aiGeneratedSummary);
    closeAiModal();
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loading}>Loading resume...</div>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.error}>
          {error || 'Resume not found'}
          <Link href="/resume" className={styles.backLink}>Back to resumes</Link>
        </div>
      </div>
    );
  }

  // Check if AI features are available
  // Free users CAN use AI until they hit their limit (5 free generations)
  // Pro users get 100/month
  const canUseAI = !isGuest && aiUsage && aiUsage.remaining > 0;
  const aiLimitReached = !isGuest && aiUsage && aiUsage.remaining <= 0;
  // AI is locked only for guests OR users who hit their limit
  const aiIsLocked = isGuest || aiLimitReached;

  // Handle upgrade button click - goes directly to Stripe checkout
  async function handleUpgradeClick() {
    await redirectToResumeProCheckout();
  }

  // Handle locked nav tab click
  function handleLockedTabClick(tab: string) {
    setUpgradeMessage(`Unlock ${tab} with Resume Builder Pro.`);
    setShowUpgradeModal(true);
  }

  // Handle AI button click with Pro check
  function handleAIButtonClick(type: 'bullets' | 'summary', targetType?: 'experience' | 'project', targetId?: string) {
    // Guests see upgrade modal prompting them to sign up
    if (isGuest) {
      setUpgradeMessage('Sign up for free to get 5 AI generations, or upgrade to Pro for 100/month.');
      setShowUpgradeModal(true);
      return;
    }

    // Users who've hit their limit (free: 5 total, pro: 100/month)
    if (aiLimitReached) {
      if (isPro) {
        setUpgradeMessage('You\'ve used all 100 AI generations this month. Your limit resets next month.');
      } else {
        setUpgradeMessage('You\'ve used all 5 free AI generations. Upgrade to Pro for 100 generations per month.');
      }
      setShowUpgradeModal(true);
      return;
    }

    // User can use AI (has remaining generations)
    if (type === 'summary') {
      openSummaryModal();
    } else if (targetType && targetId) {
      openAiModal(targetType, targetId);
    }
  }

  return (
    <div className={styles.container}>
      {/* Guest Banner */}
      {isGuest && (
        <div className={styles.guestBanner}>
          <span>Guest mode - saved locally only. AI features disabled.</span>
          <Link href="/pricing.html" className={styles.guestBannerLink}>
            Create free account
          </Link>
        </div>
      )}

      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <Link href="/resume" className={styles.backButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <input
            type="text"
            value={resume.title}
            onChange={(e) => handleUpdateResumeTitle(e.target.value)}
            className={styles.titleInput}
            placeholder="Resume title"
          />
          {saveStatus === 'saving' && (
            <span className={styles.savingIndicator}>
              <svg className={styles.spinner} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className={`${styles.savingIndicator} ${styles.saved}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className={`${styles.savingIndicator} ${styles.saveError}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Error saving
            </span>
          )}
        </div>
        <div className={styles.topBarRight}>
          {/* AI Usage Indicator */}
          {!isGuest && aiUsage && (
            <div className={styles.aiUsageIndicator}>
              <svg className={styles.sparkleSmall} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>{aiUsage.remaining}/{aiUsage.limit} AI</span>
            </div>
          )}

          {/* Template Selector Button */}
          <button
            className={styles.templateButton}
            onClick={() => setShowTemplateGallery(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            {getTemplateConfig(resume.template || 'clean').displayName}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Color Theme Selector - Pro only */}
          <div className={styles.colorSelector}>
            <button
              className={styles.colorDropdownButton}
              onClick={() => setShowColorDropdown(!showColorDropdown)}
              title={!isPro ? 'Pro feature - Custom color themes' : 'Select color theme'}
            >
              <span
                className={styles.colorSwatch}
                style={{
                  backgroundColor: COLOR_THEMES[(resume.color_theme || 'default') as ColorThemeId]?.color || '#000000'
                }}
              />
              <span>{COLOR_THEMES[resume.color_theme as ColorThemeId]?.name || 'Black'}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {showColorDropdown && (
              <div className={styles.colorDropdownMenu}>
                {Object.entries(COLOR_THEMES).map(([id, theme]) => (
                  <button
                    key={id}
                    className={`${styles.colorDropdownItem} ${resume.color_theme === id || (!resume.color_theme && id === 'default') ? styles.colorDropdownItemActive : ''}`}
                    onClick={() => {
                      handleUpdateColorTheme(id);
                      setShowColorDropdown(false);
                    }}
                  >
                    <span
                      className={styles.colorSwatch}
                      style={{
                        backgroundColor: theme.color || '#000000'
                      }}
                    />
                    <span>{theme.name}</span>
                    {id !== 'default' && !isPro && <span className={styles.colorLockIcon}>ðŸ”’</span>}
                    {(resume.color_theme === id || (!resume.color_theme && id === 'default')) && (
                      <svg className={styles.colorCheckIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className={styles.downloadButton}
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <svg className={styles.spinner} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                PDF
              </>
            )}
          </button>

          {/* Upgrade Button - only show for non-Pro users */}
          {!isGuest && !isPro && (
            <button className={styles.upgradeButton} onClick={handleUpgradeClick}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              Upgrade - $9.99
            </button>
          )}
        </div>
      </header>

      {/* Sub-navigation Tabs */}
      <nav className={styles.subNav}>
        <Link href="/resume" className={styles.subNavTab}>
          My Resumes
        </Link>
        {isPro ? (
          <Link href="/resume/cover-letter" className={styles.subNavTab}>
            Cover Letters
          </Link>
        ) : (
          <button
            className={`${styles.subNavTab} ${styles.lockedTab}`}
            onClick={() => handleLockedTabClick('Cover Letters')}
            title="Pro feature - Generate AI cover letters"
          >
            Cover Letters
            <span className={styles.lockIcon}>ðŸ”’</span>
            <span className={styles.tabProBadge}>PRO</span>
          </button>
        )}
        {isPro ? (
          <Link href="/resume/jobs" className={styles.subNavTab}>
            Job Tracker
          </Link>
        ) : (
          <button
            className={`${styles.subNavTab} ${styles.lockedTab}`}
            onClick={() => handleLockedTabClick('Job Tracker')}
            title="Pro feature - Track unlimited job applications"
          >
            Job Tracker
            <span className={styles.lockIcon}>ðŸ”’</span>
            <span className={styles.tabProBadge}>PRO</span>
          </button>
        )}
      </nav>

      <div className={styles.mainLayout}>
        {/* Left Panel - Form */}
        <div className={styles.formPanel}>
          {/* Personal Info */}
          <div className={`${styles.section} ${openSections.includes('personal') ? styles.open : ''}`}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('personal')}>
              <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span>Personal Info</span>
              </div>
              <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={styles.sectionContent}>
              {/* Profile Photo */}
              <div className={styles.photoSection}>
                <div className={styles.photoPreview}>
                  {personalInfo.photo_url ? (
                    <img src={personalInfo.photo_url} alt="Profile" />
                  ) : (
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className={styles.photoActions}>
                  <button
                    type="button"
                    className={styles.uploadPhotoButton}
                    onClick={() => setShowPhotoCropper(true)}
                  >
                    {personalInfo.photo_url ? 'Change Photo' : 'Upload Photo'}
                  </button>
                  {personalInfo.photo_url && (
                    <button
                      type="button"
                      className={styles.removePhotoButton}
                      onClick={handlePhotoRemove}
                    >
                      Remove
                    </button>
                  )}
                  <span className={styles.photoHint}>Optional - for select templates</span>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>First Name</label>
                  <input type="text" value={personalInfo.first_name || ''} onChange={(e) => updatePersonalField('first_name', e.target.value)} placeholder="John" />
                </div>
                <div className={styles.formGroup}>
                  <label>Last Name</label>
                  <input type="text" value={personalInfo.last_name || ''} onChange={(e) => updatePersonalField('last_name', e.target.value)} placeholder="Smith" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Email</label>
                  <input type="email" value={personalInfo.email || ''} onChange={(e) => updatePersonalField('email', e.target.value)} placeholder="john@email.com" />
                </div>
                <div className={styles.formGroup}>
                  <label>Phone</label>
                  <input type="tel" value={personalInfo.phone || ''} onChange={(e) => updatePersonalField('phone', e.target.value)} placeholder="(555) 123-4567" />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Location</label>
                <input type="text" value={personalInfo.location || ''} onChange={(e) => updatePersonalField('location', e.target.value)} placeholder="City, State" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>LinkedIn (optional)</label>
                  <input type="text" value={personalInfo.linkedin_url || ''} onChange={(e) => updatePersonalField('linkedin_url', e.target.value)} placeholder="linkedin.com/in/..." />
                </div>
                <div className={styles.formGroup}>
                  <label>Website (optional)</label>
                  <input type="text" value={personalInfo.website_url || ''} onChange={(e) => updatePersonalField('website_url', e.target.value)} placeholder="yoursite.com" />
                </div>
              </div>
              <div className={styles.formGroup}>
                <div className={styles.labelWithAction}>
                  <label>Summary</label>
                  <button
                    type="button"
                    onClick={() => handleAIButtonClick('summary')}
                    className={`${styles.aiButton} ${aiIsLocked ? styles.aiButtonLocked : ''}`}
                    title={isGuest ? 'Sign up to use AI features' : aiLimitReached ? 'Upgrade for more AI generations' : 'Generate summary with AI'}
                  >
                    <svg className={styles.sparkle} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span>Generate</span>
                    {aiIsLocked && (
                      <span className={styles.proBadge}>
                        <span className={styles.lockIconSmall}>ðŸ”’</span> {aiLimitReached ? 'LIMIT' : 'PRO'}
                      </span>
                    )}
                  </button>
                </div>
                <textarea value={personalInfo.summary || ''} onChange={(e) => updatePersonalField('summary', e.target.value)} placeholder="Brief summary about yourself..." rows={4} />
              </div>
            </div>
          </div>

          {/* Education */}
          <div className={`${styles.section} ${openSections.includes('education') ? styles.open : ''}`}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('education')}>
              <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c3 3 9 3 12 0v-5" />
                  </svg>
                </div>
                <span>Education</span>
                <span className={styles.count}>{education.length}</span>
              </div>
              <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={styles.sectionContent}>
              {education.map((edu, index) => (
                <div key={edu.id} className={styles.entryCard}>
                  <div className={styles.entryHeader}>
                    <span>Education {index + 1}</span>
                    <button onClick={() => handleDeleteEducation(edu.id)} className={styles.deleteEntry}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className={styles.formGroup}>
                    <label>School Name</label>
                    <input type="text" value={edu.school_name} onChange={(e) => handleUpdateEducation(edu.id, 'school_name', e.target.value)} placeholder="School name" />
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Degree</label>
                      <input type="text" value={edu.degree || ''} onChange={(e) => handleUpdateEducation(edu.id, 'degree', e.target.value)} placeholder="High School Diploma" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Field of Study</label>
                      <input type="text" value={edu.field_of_study || ''} onChange={(e) => handleUpdateEducation(edu.id, 'field_of_study', e.target.value)} placeholder="General" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Start Date</label>
                      <input type="text" value={edu.start_date || ''} onChange={(e) => handleUpdateEducation(edu.id, 'start_date', e.target.value)} placeholder="Sep 2022" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>End Date</label>
                      <input type="text" value={edu.end_date || ''} onChange={(e) => handleUpdateEducation(edu.id, 'end_date', e.target.value)} placeholder="Jun 2026" disabled={edu.is_current} />
                    </div>
                  </div>
                  <div className={styles.checkboxRow}>
                    <input type="checkbox" id={`edu-current-${edu.id}`} checked={edu.is_current} onChange={(e) => handleUpdateEducation(edu.id, 'is_current', e.target.checked)} />
                    <label htmlFor={`edu-current-${edu.id}`}>Currently attending</label>
                  </div>
                  <div className={styles.formGroup}>
                    <label>GPA (optional)</label>
                    <input type="text" value={edu.gpa || ''} onChange={(e) => handleUpdateEducation(edu.id, 'gpa', e.target.value)} placeholder="3.8" />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Achievements / Activities</label>
                    <textarea value={edu.achievements || ''} onChange={(e) => handleUpdateEducation(edu.id, 'achievements', e.target.value)} placeholder="Honor roll, clubs, sports..." rows={3} />
                  </div>
                </div>
              ))}
              <button onClick={addEducation} className={styles.addButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Education
              </button>
            </div>
          </div>

          {/* Experience */}
          <div className={`${styles.section} ${openSections.includes('experience') ? styles.open : ''}`}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('experience')}>
              <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <span>Experience</span>
                <span className={styles.count}>{experience.length}</span>
              </div>
              <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={styles.sectionContent}>
              {experience.map((exp, index) => (
                <div key={exp.id} className={styles.entryCard}>
                  <div className={styles.entryHeader}>
                    <span>Experience {index + 1}</span>
                    <button onClick={() => handleDeleteExperience(exp.id)} className={styles.deleteEntry}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Job Title</label>
                      <input type="text" value={exp.job_title} onChange={(e) => handleUpdateExperience(exp.id, 'job_title', e.target.value)} placeholder="Cashier" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Type</label>
                      <select value={exp.experience_type} onChange={(e) => handleUpdateExperience(exp.id, 'experience_type', e.target.value)}>
                        <option value="job">Job</option>
                        <option value="internship">Internship</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="parttime">Part-time</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Company / Organization</label>
                      <input type="text" value={exp.company_name} onChange={(e) => handleUpdateExperience(exp.id, 'company_name', e.target.value)} placeholder="Company name" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Location</label>
                      <input type="text" value={exp.location || ''} onChange={(e) => handleUpdateExperience(exp.id, 'location', e.target.value)} placeholder="City, State" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Start Date</label>
                      <input type="text" value={exp.start_date || ''} onChange={(e) => handleUpdateExperience(exp.id, 'start_date', e.target.value)} placeholder="Jun 2024" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>End Date</label>
                      <input type="text" value={exp.end_date || ''} onChange={(e) => handleUpdateExperience(exp.id, 'end_date', e.target.value)} placeholder="Present" disabled={exp.is_current} />
                    </div>
                  </div>
                  <div className={styles.checkboxRow}>
                    <input type="checkbox" id={`exp-current-${exp.id}`} checked={exp.is_current} onChange={(e) => handleUpdateExperience(exp.id, 'is_current', e.target.checked)} />
                    <label htmlFor={`exp-current-${exp.id}`}>Currently working here</label>
                  </div>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWithAction}>
                      <label>Description</label>
                      <button
                        type="button"
                        onClick={() => handleAIButtonClick('bullets', 'experience', exp.id)}
                        className={`${styles.aiButton} ${aiIsLocked ? styles.aiButtonLocked : ''}`}
                        title={isGuest ? 'Sign up to use AI features' : aiLimitReached ? 'Upgrade for more AI generations' : 'Generate bullet points with AI'}
                      >
                        <svg className={styles.sparkle} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span>AI Bullets</span>
                        {(isGuest || !isPro) && (
                          <span className={styles.proBadge}>
                            <span className={styles.lockIconSmall}>ðŸ”’</span> PRO
                          </span>
                        )}
                      </button>
                    </div>
                    <div className={styles.bulletList}>
                      {(exp.description || '').split('\n').filter(Boolean).map((line, i) => (
                        <div key={i} className={styles.bulletItem}>
                          <span className={styles.bulletDot}>•</span>
                          <input
                            type="text"
                            value={line.replace(/^[-•]\s*/, '')}
                            onChange={(e) => {
                              const bullets = (exp.description || '').split('\n').filter(Boolean);
                              bullets[i] = e.target.value;
                              handleUpdateExperience(exp.id, 'description', bullets.join('\n'));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const bullets = (exp.description || '').split('\n').filter(Boolean);
                                bullets.splice(i + 1, 0, '');
                                handleUpdateExperience(exp.id, 'description', bullets.join('\n'));
                                setTimeout(() => {
                                  const next = (e.target as HTMLInputElement).parentElement?.nextElementSibling?.querySelector('input');
                                  next?.focus();
                                }, 50);
                              } else if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value) {
                                e.preventDefault();
                                const bullets = (exp.description || '').split('\n').filter(Boolean);
                                if (bullets.length > 1) {
                                  bullets.splice(i, 1);
                                  handleUpdateExperience(exp.id, 'description', bullets.join('\n'));
                                  setTimeout(() => {
                                    const prev = (e.target as HTMLInputElement).parentElement?.previousElementSibling?.querySelector('input');
                                    prev?.focus();
                                  }, 50);
                                }
                              }
                            }}
                            placeholder="Describe what you did..."
                            className={styles.bulletInput}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const bullets = (exp.description || '').split('\n').filter(Boolean);
                              bullets.splice(i, 1);
                              handleUpdateExperience(exp.id, 'description', bullets.join('\n'));
                            }}
                            className={styles.removeBullet}
                            title="Remove bullet"
                          >×</button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const current = exp.description || '';
                          const bullets = current.split('\n').filter(Boolean);
                          bullets.push('');
                          handleUpdateExperience(exp.id, 'description', bullets.join('\n'));
                        }}
                        className={styles.addBulletButton}
                      >+ Add Bullet Point</button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addExperience} className={styles.addButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Experience
              </button>
            </div>
          </div>

          {/* Skills */}
          <div className={`${styles.section} ${openSections.includes('skills') ? styles.open : ''}`}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('skills')}>
              <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <span>Skills</span>
                <span className={styles.count}>{skills.length}</span>
              </div>
              <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={styles.sectionContent}>
              <div className={styles.skillsGrid}>
                {skills.map((skill) => (
                  <div key={skill.id} className={styles.skillChip}>
                    <input type="text" value={skill.skill_name} onChange={(e) => handleUpdateSkill(skill.id, e.target.value)} placeholder="Skill" />
                    <button onClick={() => handleDeleteSkill(skill.id)} className={styles.removeSkill}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addSkill} className={styles.addButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Skill
              </button>
            </div>
          </div>

          {/* Projects */}
          <div className={`${styles.section} ${openSections.includes('projects') ? styles.open : ''}`}>
            <button className={styles.sectionHeader} onClick={() => toggleSection('projects')}>
              <div className={styles.sectionHeaderLeft}>
                <div className={styles.sectionIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <span>Projects & Activities</span>
                <span className={styles.count}>{projects.length}</span>
              </div>
              <svg className={styles.chevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className={styles.sectionContent}>
              {projects.map((project, index) => (
                <div key={project.id} className={styles.entryCard}>
                  <div className={styles.entryHeader}>
                    <span>Project {index + 1}</span>
                    <button onClick={() => handleDeleteProject(project.id)} className={styles.deleteEntry}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Project / Activity Name</label>
                      <input type="text" value={project.project_name} onChange={(e) => handleUpdateProject(project.id, 'project_name', e.target.value)} placeholder="Science Fair Project" />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Type</label>
                      <select value={project.project_type} onChange={(e) => handleUpdateProject(project.id, 'project_type', e.target.value)}>
                        <option value="project">Project</option>
                        <option value="club">Club</option>
                        <option value="sport">Sport</option>
                        <option value="activity">Activity</option>
                        <option value="competition">Competition</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>Organization (optional)</label>
                      <input type="text" value={project.organization || ''} onChange={(e) => handleUpdateProject(project.id, 'organization', e.target.value)} placeholder="School, club name..." />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Your Role</label>
                      <input type="text" value={project.role || ''} onChange={(e) => handleUpdateProject(project.id, 'role', e.target.value)} placeholder="Team Lead" />
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <div className={styles.labelWithAction}>
                      <label>Description</label>
                      <button
                        type="button"
                        onClick={() => handleAIButtonClick('bullets', 'project', project.id)}
                        className={`${styles.aiButton} ${aiIsLocked ? styles.aiButtonLocked : ''}`}
                        title={isGuest ? 'Sign up to use AI features' : aiLimitReached ? 'Upgrade for more AI generations' : 'Generate bullet points with AI'}
                      >
                        <svg className={styles.sparkle} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        <span>AI Bullets</span>
                        {(isGuest || !isPro) && (
                          <span className={styles.proBadge}>
                            <span className={styles.lockIconSmall}>ðŸ”’</span> PRO
                          </span>
                        )}
                      </button>
                    </div>
                    <div className={styles.bulletList}>
                      {(project.description || '').split('\n').filter(Boolean).map((line, i) => (
                        <div key={i} className={styles.bulletItem}>
                          <span className={styles.bulletDot}>•</span>
                          <input
                            type="text"
                            value={line.replace(/^[-•]\s*/, '')}
                            onChange={(e) => {
                              const bullets = (project.description || '').split('\n').filter(Boolean);
                              bullets[i] = e.target.value;
                              handleUpdateProject(project.id, 'description', bullets.join('\n'));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const bullets = (project.description || '').split('\n').filter(Boolean);
                                bullets.splice(i + 1, 0, '');
                                handleUpdateProject(project.id, 'description', bullets.join('\n'));
                                setTimeout(() => {
                                  const next = (e.target as HTMLInputElement).parentElement?.nextElementSibling?.querySelector('input');
                                  next?.focus();
                                }, 50);
                              } else if (e.key === 'Backspace' && !(e.target as HTMLInputElement).value) {
                                e.preventDefault();
                                const bullets = (project.description || '').split('\n').filter(Boolean);
                                if (bullets.length > 1) {
                                  bullets.splice(i, 1);
                                  handleUpdateProject(project.id, 'description', bullets.join('\n'));
                                  setTimeout(() => {
                                    const prev = (e.target as HTMLInputElement).parentElement?.previousElementSibling?.querySelector('input');
                                    prev?.focus();
                                  }, 50);
                                }
                              }
                            }}
                            placeholder="What did you do or accomplish?"
                            className={styles.bulletInput}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const bullets = (project.description || '').split('\n').filter(Boolean);
                              bullets.splice(i, 1);
                              handleUpdateProject(project.id, 'description', bullets.join('\n'));
                            }}
                            className={styles.removeBullet}
                            title="Remove bullet"
                          >×</button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const current = project.description || '';
                          const bullets = current.split('\n').filter(Boolean);
                          bullets.push('');
                          handleUpdateProject(project.id, 'description', bullets.join('\n'));
                        }}
                        className={styles.addBulletButton}
                      >+ Add Bullet Point</button>
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addProject} className={styles.addButton}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Project / Activity
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className={styles.previewPanel}>
          {/* ============================================ */}
          {/* TEMPLATE PREVIEW RENDERER                   */}
          {/* Each of the 13 templates renders distinctly */}
          {/* ============================================ */}
          {(() => {
            const templateId = getEffectiveTemplateId(resume.template);
            const spec = getTemplate(templateId);
            const colors = getEffectiveColors(templateId, resume.color_theme);

            const fullName = personalInfo.first_name || personalInfo.last_name
              ? `${personalInfo.first_name || ''} ${personalInfo.last_name || ''}`.trim()
              : 'Your Name';
            const firstName = personalInfo.first_name || 'Your';
            const lastName = personalInfo.last_name || 'Name';
            const contactParts = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin_url, personalInfo.website_url].filter(Boolean);

            const serifFont = 'Georgia, "Times New Roman", serif';
            const sansFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';
            const fontFamily = spec.fontFamily === 'serif' ? serifFont : sansFont;

            // ============================================
            // 1. HARVARD TEMPLATE
            // Centered, serif, education first, line under contact
            // ============================================
            if (templateId === 'harvard') {
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: serifFont,
                  padding: '48px',
                  lineHeight: 1.4,
                  color: '#000',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <h1 style={{ fontSize: '1.9rem', fontWeight: 700, margin: 0, color: '#000' }}>{fullName}</h1>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: '#333',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #000',
                  }}>
                    {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                  </div>
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '14px' }}>
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '10px', color: '#000' }}>Summary</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '10px', color: '#000' }}>Education</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                            <span style={{ fontSize: '0.85rem' }}>{edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}</span>
                          </div>
                          {(edu.degree || edu.field_of_study) && (
                            <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa && ` | GPA: ${edu.gpa}`}</div>
                          )}
                          {edu.achievements && <p style={{ fontSize: '0.85rem', margin: '4px 0 0', color: '#333' }}>{edu.achievements}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '10px', color: '#000' }}>Experience</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                            <span style={{ fontSize: '0.85rem' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>{exp.company_name}{exp.location ? `, ${exp.location}` : ''}</div>
                          {exp.description && (
                            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-â€¢]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div style={{ marginBottom: '14px' }}>
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '10px', color: '#000' }}>Skills</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0 }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                    </div>
                  )}
                  {projects.length > 0 && (
                    <div>
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '10px', color: '#000' }}>Activities & Projects</h2>
                      {projects.map((project) => (
                        <div key={project.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{project.project_name}</strong>
                            {project.role && <span style={{ fontSize: '0.85rem' }}>{project.role}</span>}
                          </div>
                          {project.organization && <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>{project.organization}</div>}
                          {project.description && (
                            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {project.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 2. JAKE'S RESUME TEMPLATE
            // Left-aligned, sans-serif, THICK underlines, large name
            // ============================================
            if (templateId === 'jakes') {
              const jakeSectionStyle: React.CSSProperties = {
                fontSize: '0.95rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                borderBottom: '2px solid #000',
                paddingBottom: '4px',
                marginBottom: '10px',
                color: '#000',
              };
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: sansFont,
                  padding: '36px 40px',
                  lineHeight: 1.3,
                  color: '#000',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ marginBottom: '2px' }}>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 700, margin: 0, color: '#000', letterSpacing: '-0.5px' }}>{fullName}</h1>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#333', marginBottom: '14px' }}>
                    {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                  </div>
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '12px' }}>
                      <h2 style={jakeSectionStyle}>Summary</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: '#222' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <h2 style={jakeSectionStyle}>Education</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                            <span style={{ fontSize: '0.85rem' }}>{edu.start_date}{edu.end_date ? ` -- ${edu.is_current ? 'Present' : edu.end_date}` : ''}</span>
                          </div>
                          {(edu.degree || edu.field_of_study) && (
                            <div style={{ fontSize: '0.9rem', color: '#333' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa && ` (GPA: ${edu.gpa})`}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <h2 style={jakeSectionStyle}>Experience</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div>
                              <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                              <span style={{ fontSize: '0.9rem', color: '#333' }}> | {exp.company_name}{exp.location ? `, ${exp.location}` : ''}</span>
                            </div>
                            <span style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{exp.start_date}{exp.end_date ? ` -- ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          {exp.description && (
                            <ul style={{ margin: '4px 0 0 18px', paddingLeft: 0, listStyleType: 'disc', listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.9rem', color: '#222', marginBottom: '2px' }}>{line.replace(/^[-â€¢]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {projects.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <h2 style={jakeSectionStyle}>Projects</h2>
                      {projects.map((project) => (
                        <div key={project.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{project.project_name}</strong>
                            {project.role && <span style={{ fontSize: '0.85rem' }}>{project.role}</span>}
                          </div>
                          {project.description && (
                            <ul style={{ margin: '2px 0 0 18px', paddingLeft: 0, listStyleType: 'disc', listStylePosition: 'outside' }}>
                              {project.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.9rem', color: '#222', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div>
                      <h2 style={jakeSectionStyle}>Technical Skills</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0 }}><strong>Languages & Tools:</strong> {skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 3. CLASSIC PROFESSIONAL TEMPLATE
            // Serif, left-aligned, gray underlines
            // ============================================
            if (templateId === 'classic') {
              const classicSectionStyle: React.CSSProperties = {
                fontSize: '0.95rem',
                fontWeight: 700,
                borderBottom: '1px solid #999',
                paddingBottom: '3px',
                marginBottom: '10px',
                color: '#000',
              };
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: serifFont,
                  padding: '48px',
                  lineHeight: 1.5,
                  color: '#000',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ marginBottom: '8px' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#000' }}>{fullName}</h1>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '18px' }}>
                    {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                  </div>
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '18px' }}>
                      <h2 style={classicSectionStyle}>Summary</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '18px' }}>
                      <h2 style={classicSectionStyle}>Experience</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>{exp.company_name}{exp.location ? `, ${exp.location}` : ''}</div>
                          {exp.description && (
                            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-â€¢]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '18px' }}>
                      <h2 style={classicSectionStyle}>Education</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}</span>
                          </div>
                          {(edu.degree || edu.field_of_study) && (
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa && ` | GPA: ${edu.gpa}`}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div>
                      <h2 style={classicSectionStyle}>Skills</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0 }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 4. MODERN CLEAN TEMPLATE
            // Sans-serif, left-aligned, bold headers with spacing (no underline)
            // ============================================
            if (templateId === 'modern') {
              const modernSectionStyle: React.CSSProperties = {
                fontSize: '0.9rem',
                fontWeight: 700,
                letterSpacing: '2px',
                marginBottom: '10px',
                color: colors.primaryColor,
              };
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: sansFont,
                  padding: '40px',
                  lineHeight: 1.35,
                  color: '#000',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ marginBottom: '6px' }}>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: colors.primaryColor }}>{fullName}</h1>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '14px' }}>
                    {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                  </div>
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '14px' }}>
                      <h2 style={modernSectionStyle}>SUMMARY</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <h2 style={modernSectionStyle}>EXPERIENCE</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                            <span style={{ fontSize: '0.85rem', color: colors.primaryColor }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>{exp.company_name}{exp.location ? ` - ${exp.location}` : ''}</div>
                          {exp.description && (
                            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-â€¢]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '14px' }}>
                      <h2 style={modernSectionStyle}>EDUCATION</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                            <span style={{ fontSize: '0.85rem', color: colors.primaryColor }}>{edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}</span>
                          </div>
                          {(edu.degree || edu.field_of_study) && (
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa && ` | GPA: ${edu.gpa}`}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div>
                      <h2 style={modernSectionStyle}>SKILLS</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0 }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 5. TWO-COLUMN SIDEBAR TEMPLATE
            // Left sidebar with gray background
            // ============================================
            if (templateId === 'sidebar') {
              return (
                <div className={`${styles.resumePreview} ${styles.modernTemplate}`} style={{ fontFamily: sansFont, display: 'flex' }}>
                  <div className={styles.modernSidebar} style={{
                    width: '30%',
                    backgroundColor: colors.sidebarBg || '#f5f5f5',
                    padding: '24px 16px',
                    color: '#333',
                  }}>
                    <div className={styles.modernNameSection}>
                      <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333', marginBottom: '2px' }}>{firstName}</h1>
                      <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#333' }}>{lastName}</h1>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                      <h3 style={{ fontSize: '0.7rem', color: colors.primaryColor, fontWeight: 600, textTransform: 'uppercase', borderBottom: `1px solid ${colors.primaryColor}`, paddingBottom: '3px', marginBottom: '8px' }}>Contact</h3>
                      <div style={{ fontSize: '0.75rem', color: '#333' }}>
                        {personalInfo.email && <p style={{ margin: '4px 0' }}>{personalInfo.email}</p>}
                        {personalInfo.phone && <p style={{ margin: '4px 0' }}>{personalInfo.phone}</p>}
                        {personalInfo.location && <p style={{ margin: '4px 0' }}>{personalInfo.location}</p>}
                      </div>
                    </div>
                    {skills.length > 0 && skills.some(s => s.skill_name) && (
                      <div style={{ marginTop: '20px' }}>
                        <h3 style={{ fontSize: '0.7rem', color: colors.primaryColor, fontWeight: 600, textTransform: 'uppercase', borderBottom: `1px solid ${colors.primaryColor}`, paddingBottom: '3px', marginBottom: '8px' }}>Skills</h3>
                        <div style={{ fontSize: '0.75rem', color: '#333' }}>
                          {skills.filter(s => s.skill_name).map((skill) => (
                            <p key={skill.id} style={{ margin: '4px 0' }}>{skill.skill_name}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: '24px', backgroundColor: '#fff' }}>
                    {personalInfo.summary && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.85rem', color: colors.primaryColor, fontWeight: 600, textTransform: 'uppercase', borderBottom: `1px solid ${colors.primaryColor}`, paddingBottom: '3px', marginBottom: '10px' }}>Summary</h2>
                        <p style={{ fontSize: '0.85rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                      </div>
                    )}
                    {experience.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.85rem', color: colors.primaryColor, fontWeight: 600, textTransform: 'uppercase', borderBottom: `1px solid ${colors.primaryColor}`, paddingBottom: '3px', marginBottom: '10px' }}>Experience</h2>
                        {experience.map((exp) => (
                          <div key={exp.id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <strong style={{ fontSize: '0.9rem' }}>{exp.job_title || 'Job Title'}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#666' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#666' }}>{exp.company_name}</div>
                            {exp.description && (
                              <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                                {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                  <li key={i} style={{ fontSize: '0.8rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {education.length > 0 && (
                      <div>
                        <h2 style={{ fontSize: '0.85rem', color: colors.primaryColor, fontWeight: 600, textTransform: 'uppercase', borderBottom: `1px solid ${colors.primaryColor}`, paddingBottom: '3px', marginBottom: '10px' }}>Education</h2>
                        {education.map((edu) => (
                          <div key={edu.id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <strong style={{ fontSize: '0.9rem' }}>{edu.school_name || 'School Name'}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#666' }}>{edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}</span>
                            </div>
                            {(edu.degree || edu.field_of_study) && (
                              <div style={{ fontSize: '0.8rem', color: '#666' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ============================================
            // 6. BOLD HEADER TEMPLATE
            // Colored header bar with white text
            // ============================================
            if (templateId === 'bold-header') {
              return (
                <div className={`${styles.resumePreview} ${styles.boldTemplate}`} style={{ fontFamily: sansFont }}>
                  <div style={{
                    backgroundColor: colors.headerBg || colors.primaryColor,
                    padding: '28px 32px',
                    textAlign: 'center',
                  }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', margin: 0 }}>{fullName}</h1>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', marginTop: '8px' }}>
                      {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567'}
                    </div>
                  </div>
                  <div style={{ padding: '24px 32px', backgroundColor: '#fff', lineHeight: 1.4 }}>
                    {personalInfo.summary && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.95rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '8px' }}>About Me</h2>
                        <p style={{ fontSize: '0.9rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                      </div>
                    )}
                    {experience.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.95rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '10px' }}>Work Experience</h2>
                        {experience.map((exp) => (
                          <div key={exp.id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                              <span style={{ fontSize: '0.85rem', color: '#666' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>{exp.company_name}</div>
                            {exp.description && (
                              <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                                {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                  <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {education.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.95rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '10px' }}>Education</h2>
                        {education.map((edu) => (
                          <div key={edu.id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                              <span style={{ fontSize: '0.85rem', color: '#666' }}>{edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}</span>
                            </div>
                            {(edu.degree || edu.field_of_study) && (
                              <div style={{ fontSize: '0.9rem', color: '#666' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {skills.length > 0 && skills.some(s => s.skill_name) && (
                      <div>
                        <h2 style={{ fontSize: '0.95rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '8px' }}>Skills</h2>
                        <p style={{ fontSize: '0.9rem', margin: 0 }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ============================================
            // 7. MINIMAL TEMPLATE
            // Ultra-clean, light gray section headers, lots of whitespace
            // ============================================
            if (templateId === 'minimal') {
              const minimalSectionStyle: React.CSSProperties = {
                fontSize: '0.8rem',
                fontWeight: 400,
                letterSpacing: '2px',
                marginBottom: '12px',
                color: '#999',
                textTransform: 'uppercase',
              };
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: sansFont,
                  padding: '48px',
                  lineHeight: 1.6,
                  color: '#333',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 300, margin: 0, color: '#333', letterSpacing: '1px' }}>{fullName}</h1>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#999', marginBottom: '24px' }}>
                    {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                  </div>
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '24px' }}>
                      <h2 style={minimalSectionStyle}>Profile</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h2 style={minimalSectionStyle}>Experience</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem', fontWeight: 600 }}>{exp.job_title || 'Job Title'}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#999' }}>{exp.start_date}{exp.end_date ? ` â€” ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>{exp.company_name}</div>
                          {exp.description && (
                            <ul style={{ margin: '6px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h2 style={minimalSectionStyle}>Education</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem', fontWeight: 600 }}>{edu.school_name || 'School Name'}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#999' }}>{edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}</span>
                          </div>
                          {(edu.degree || edu.field_of_study) && (
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>{edu.degree}{edu.field_of_study ? `, ${edu.field_of_study}` : ''}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div>
                      <h2 style={minimalSectionStyle}>Skills</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: '#333' }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join('  /  ')}</p>
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 8. COMPACT TEMPLATE
            // Tight spacing, smaller text, line under contact
            // ============================================
            if (templateId === 'compact') {
              const compactSectionStyle: React.CSSProperties = {
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                borderBottom: '1px solid #000',
                paddingBottom: '2px',
                marginBottom: '6px',
                color: '#000',
              };
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: sansFont,
                  padding: '28px 32px',
                  lineHeight: 1.2,
                  color: '#000',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ marginBottom: '4px' }}>
                    <h1 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#000' }}>{fullName}</h1>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#333',
                    marginBottom: '10px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #000',
                  }}>
                    {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                  </div>
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '8px' }}>
                      <h2 style={compactSectionStyle}>Summary</h2>
                      <p style={{ fontSize: '0.8rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <h2 style={compactSectionStyle}>Experience</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.85rem' }}>{exp.job_title} â€” {exp.company_name}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          {exp.description && (
                            <ul style={{ margin: '2px 0 0 14px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.75rem', color: '#333', marginBottom: '1px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <h2 style={compactSectionStyle}>Education</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.85rem' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''} â€” {edu.school_name}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>{edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div>
                      <h2 style={compactSectionStyle}>Skills</h2>
                      <p style={{ fontSize: '0.8rem', margin: 0 }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 9. CREATIVE MODERN TEMPLATE
            // Colored accent bar, colored section headers, icons in contact
            // ============================================
            if (templateId === 'creative') {
              const creativeSectionStyle: React.CSSProperties = {
                fontSize: '0.9rem',
                fontWeight: 700,
                marginBottom: '10px',
                color: colors.primaryColor,
              };
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: sansFont,
                  padding: '40px 48px',
                  lineHeight: 1.4,
                  color: '#000',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ width: '4px', height: '40px', backgroundColor: colors.primaryColor, marginRight: '12px' }} />
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: colors.primaryColor }}>{fullName}</h1>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '20px' }}>
                    {personalInfo.email && <span>ðŸ“§ {personalInfo.email}</span>}
                    {personalInfo.phone && <span style={{ marginLeft: '16px' }}>ðŸ“± {personalInfo.phone}</span>}
                    {personalInfo.location && <span style={{ marginLeft: '16px' }}>ðŸ“ {personalInfo.location}</span>}
                  </div>
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={creativeSectionStyle}>About Me</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={creativeSectionStyle}>Experience</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                            <span style={{ fontSize: '0.85rem', color: colors.primaryColor }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>{exp.company_name}</div>
                          {exp.description && (
                            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={creativeSectionStyle}>Education</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                            <span style={{ fontSize: '0.85rem', color: colors.primaryColor }}>{edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}</span>
                          </div>
                          {(edu.degree || edu.field_of_study) && (
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div>
                      <h2 style={creativeSectionStyle}>Skills</h2>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {skills.filter(s => s.skill_name).map((skill) => (
                          <span key={skill.id} style={{
                            backgroundColor: `${colors.primaryColor}15`,
                            color: colors.primaryColor,
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                          }}>{skill.skill_name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 10. EXECUTIVE TEMPLATE
            // Serif, centered, small-caps centered section headers
            // ============================================
            if (templateId === 'executive') {
              const executiveSectionStyle: React.CSSProperties = {
                fontSize: '0.85rem',
                fontWeight: 700,
                textAlign: 'center',
                fontVariant: 'small-caps',
                marginBottom: '12px',
                color: '#000',
                letterSpacing: '1px',
              };
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: serifFont,
                  padding: '48px',
                  lineHeight: 1.5,
                  color: '#000',
                  backgroundColor: '#fff',
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                    <h1 style={{ fontSize: '1.7rem', fontWeight: 700, margin: 0, color: '#000' }}>{fullName}</h1>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: '#666',
                    marginBottom: '20px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #000',
                  }}>
                    {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                  </div>
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '20px' }}>
                      <h2 style={executiveSectionStyle}>Summary</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, color: '#333', textAlign: 'justify' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h2 style={executiveSectionStyle}>Professional Experience</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>{exp.company_name}{exp.location ? `, ${exp.location}` : ''}</div>
                          {exp.description && (
                            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-â€¢]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                      <h2 style={executiveSectionStyle}>Education</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                            <span style={{ fontSize: '0.85rem', color: '#666' }}>{edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}</span>
                          </div>
                          {(edu.degree || edu.field_of_study) && (
                            <div style={{ fontSize: '0.9rem', color: '#666', fontStyle: 'italic' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa && ` | GPA: ${edu.gpa}`}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div>
                      <h2 style={executiveSectionStyle}>Skills & Expertise</h2>
                      <p style={{ fontSize: '0.9rem', margin: 0, textAlign: 'center' }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join('  â€¢  ')}</p>
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 11. MODERN SPLIT TEMPLATE
            // Two-column with photo circle, sidebar, timeline
            // ============================================
            if (templateId === 'modern-split') {
              const splitSectionStyle: React.CSSProperties = {
                fontSize: '0.8rem',
                fontWeight: 600,
                color: colors.primaryColor,
                marginBottom: '6px',
                paddingBottom: '3px',
                borderBottom: `1px solid ${colors.primaryColor}`,
              };
              return (
                <div className={styles.resumePreview} style={{ fontFamily: serifFont, display: 'flex', minHeight: '100%' }}>
                  {/* Left sidebar */}
                  <div style={{
                    width: '35%',
                    backgroundColor: '#f5f5f5',
                    padding: '24px 16px',
                    color: '#333',
                    borderRight: `2px solid ${colors.primaryColor}`,
                  }}>
                    {/* Photo circle placeholder */}
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      backgroundColor: '#ddd',
                      margin: '0 auto 16px',
                      border: `3px solid ${colors.primaryColor}`,
                      overflow: 'hidden',
                    }}>
                      {personalInfo.photo_url ? (
                        <img src={personalInfo.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '0.7rem' }}>Photo</div>
                      )}
                    </div>
                    {/* Contact in sidebar */}
                    <div style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '0.7rem', color: colors.primaryColor, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Contact</h3>
                      {personalInfo.email && <p style={{ fontSize: '0.72rem', margin: '3px 0', wordBreak: 'break-all' }}>{personalInfo.email}</p>}
                      {personalInfo.phone && <p style={{ fontSize: '0.72rem', margin: '3px 0' }}>{personalInfo.phone}</p>}
                      {personalInfo.location && <p style={{ fontSize: '0.72rem', margin: '3px 0' }}>{personalInfo.location}</p>}
                      {personalInfo.linkedin_url && <p style={{ fontSize: '0.72rem', margin: '3px 0', wordBreak: 'break-all' }}>{personalInfo.linkedin_url}</p>}
                    </div>
                    {/* Skills in sidebar */}
                    {skills.length > 0 && skills.some(s => s.skill_name) && (
                      <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '0.7rem', color: colors.primaryColor, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Skills</h3>
                        {skills.filter(s => s.skill_name).map((skill) => (
                          <p key={skill.id} style={{ fontSize: '0.72rem', margin: '3px 0' }}>{skill.skill_name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Right main content */}
                  <div style={{ flex: 1, padding: '24px', backgroundColor: '#fff' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', margin: 0, color: '#000' }}>{fullName}</h1>
                    </div>
                    {personalInfo.summary && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={splitSectionStyle}>PROFILE</h2>
                        <p style={{ fontSize: '0.85rem', margin: 0, color: '#555', lineHeight: 1.5 }}>{personalInfo.summary}</p>
                      </div>
                    )}
                    {education.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={splitSectionStyle}>EDUCATION</h2>
                        {education.map((edu) => (
                          <div key={edu.id} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888', minWidth: '60px', flexShrink: 0 }}>{edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}</div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{edu.school_name || 'School Name'}</div>
                              {(edu.degree || edu.field_of_study) && (
                                <div style={{ fontSize: '0.8rem', color: '#666' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {experience.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={splitSectionStyle}>EXPERIENCE</h2>
                        {experience.map((exp) => (
                          <div key={exp.id} style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
                            <div style={{ fontSize: '0.75rem', color: '#888', minWidth: '60px', flexShrink: 0 }}>{exp.start_date}{exp.end_date ? `-${exp.is_current ? 'Present' : exp.end_date}` : ''}</div>
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{exp.job_title || 'Job Title'}</div>
                              <div style={{ fontSize: '0.8rem', color: '#666' }}>{exp.company_name}{exp.location ? `, ${exp.location}` : ''}</div>
                              {exp.description && (
                                <ul style={{ margin: '4px 0 0 14px', paddingLeft: 0, listStylePosition: 'outside' }}>
                                  {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                    <li key={i} style={{ fontSize: '0.8rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {projects.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={splitSectionStyle}>PROJECTS</h2>
                        {projects.map((proj) => (
                          <div key={proj.id} style={{ marginBottom: '8px' }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{proj.project_name || 'Project'}</div>
                            {proj.description && <p style={{ fontSize: '0.8rem', margin: '2px 0 0', color: '#555' }}>{proj.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                      <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                    )}
                  </div>
                </div>
              );
            }

            // ============================================
            // 12. CLEAN CLASSIC TEMPLATE
            // ATS-friendly, centered name, icon contact, accent lines
            // ============================================
            if (templateId === 'clean-classic') {
              const cleanSectionStyle: React.CSSProperties = {
                fontSize: '0.9rem',
                fontWeight: 700,
                textTransform: 'uppercase' as const,
                letterSpacing: '0.5px',
                marginBottom: '10px',
                paddingBottom: '4px',
                borderBottom: `1.5px solid ${colors.primaryColor}`,
                color: '#000',
              };
              return (
                <div className={styles.resumePreview} style={{
                  fontFamily: sansFont,
                  padding: '48px',
                  lineHeight: 1.4,
                  color: '#000',
                  backgroundColor: '#fff',
                }}>
                  {/* Centered name */}
                  <div style={{ textAlign: 'center', marginBottom: '4px' }}>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: '#000' }}>{fullName}</h1>
                  </div>
                  {/* Icon-style contact row */}
                  <div style={{
                    textAlign: 'center',
                    fontSize: '0.82rem',
                    color: '#555',
                    marginBottom: '20px',
                  }}>
                    {contactParts.length > 0 ? (
                      <span>
                        {personalInfo.location && <span>📍 {personalInfo.location}</span>}
                        {personalInfo.location && personalInfo.email && <span>  |  </span>}
                        {personalInfo.email && <span>📧 {personalInfo.email}</span>}
                        {personalInfo.email && personalInfo.phone && <span>  |  </span>}
                        {personalInfo.phone && <span>📱 {personalInfo.phone}</span>}
                        {personalInfo.phone && personalInfo.linkedin_url && <span>  |  </span>}
                        {personalInfo.linkedin_url && <span>🔗 {personalInfo.linkedin_url}</span>}
                      </span>
                    ) : (
                      <span>📍 City, State  |  📧 email@example.com  |  📱 (555) 123-4567</span>
                    )}
                  </div>
                  {/* Sections */}
                  {personalInfo.summary && (
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={cleanSectionStyle}>Summary</h2>
                      <p style={{ fontSize: '0.88rem', margin: 0, color: '#333' }}>{personalInfo.summary}</p>
                    </div>
                  )}
                  {education.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={cleanSectionStyle}>Education</h2>
                      {education.map((edu) => (
                        <div key={edu.id} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                            <span style={{ fontSize: '0.82rem', color: '#666' }}>{edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}</span>
                          </div>
                          {(edu.degree || edu.field_of_study) && (
                            <div style={{ fontSize: '0.88rem', color: '#555' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</div>
                          )}
                          {edu.achievements && (
                            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {edu.achievements.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.82rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {experience.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={cleanSectionStyle}>Experience</h2>
                      {experience.map((exp) => (
                        <div key={exp.id} style={{ marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                            <span style={{ fontSize: '0.82rem', color: '#666' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                          </div>
                          <div style={{ fontSize: '0.88rem', color: '#555' }}>{exp.company_name}{exp.location ? `, ${exp.location}` : ''}</div>
                          {exp.description && (
                            <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                              {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {skills.length > 0 && skills.some(s => s.skill_name) && (
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={cleanSectionStyle}>Skills</h2>
                      <p style={{ fontSize: '0.88rem', margin: 0 }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                    </div>
                  )}
                  {projects.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <h2 style={cleanSectionStyle}>Projects</h2>
                      {projects.map((proj) => (
                        <div key={proj.id} style={{ marginBottom: '8px' }}>
                          <strong style={{ fontSize: '0.92rem' }}>{proj.project_name || 'Project'}</strong>
                          {proj.organization && <span style={{ fontSize: '0.82rem', color: '#666' }}> -{proj.organization}</span>}
                          {proj.description && <p style={{ fontSize: '0.85rem', margin: '2px 0 0', color: '#333' }}>{proj.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                    <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                  )}
                </div>
              );
            }

            // ============================================
            // 13. BOLD BANNER TEMPLATE
            // Colored banner header, bracketed name, contact bar
            // ============================================
            if (templateId === 'bold-banner') {
              return (
                <div className={styles.resumePreview} style={{ fontFamily: sansFont }}>
                  {/* Colored banner header */}
                  <div style={{
                    backgroundColor: colors.headerBg || colors.primaryColor,
                    padding: '24px 32px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}>
                    {/* Photo circle in header */}
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}>
                      {personalInfo.photo_url ? (
                        <img src={personalInfo.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : null}
                    </div>
                    <div>
                      <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: 0 }}>[ {fullName.toUpperCase()} ]</h1>
                      {personalInfo.summary && (
                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', marginTop: '4px' }}>
                          {personalInfo.summary.length > 80 ? personalInfo.summary.substring(0, 80) + '...' : personalInfo.summary}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Contact bar */}
                  <div style={{
                    backgroundColor: 'rgba(0,0,0,0.05)',
                    padding: '8px 32px',
                    fontSize: '0.82rem',
                    color: '#555',
                  }}>
                    {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                  </div>
                  {/* Body content */}
                  <div style={{ padding: '24px 32px', backgroundColor: '#fff', lineHeight: 1.5 }}>
                    {personalInfo.summary && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.9rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '6px', paddingBottom: '3px', borderBottom: `1px solid ${colors.primaryColor}` }}>OBJECTIVE</h2>
                        <p style={{ fontSize: '0.88rem', margin: 0, color: '#555' }}>{personalInfo.summary}</p>
                      </div>
                    )}
                    {experience.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.9rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '6px', paddingBottom: '3px', borderBottom: `1px solid ${colors.primaryColor}` }}>EXPERIENCE</h2>
                        {experience.map((exp) => (
                          <div key={exp.id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                              <span style={{ fontSize: '0.82rem', color: '#666' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: '#666' }}>{exp.company_name}{exp.location ? `, ${exp.location}` : ''}</div>
                            {exp.description && (
                              <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                                {exp.description.split('\n').filter(Boolean).map((line, i) => (
                                  <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-•]\s*/, '')}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {education.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.9rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '6px', paddingBottom: '3px', borderBottom: `1px solid ${colors.primaryColor}` }}>EDUCATION</h2>
                        {education.map((edu) => (
                          <div key={edu.id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                              <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                              <span style={{ fontSize: '0.82rem', color: '#666' }}>{edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}</span>
                            </div>
                            {(edu.degree || edu.field_of_study) && (
                              <div style={{ fontSize: '0.88rem', color: '#666' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {skills.length > 0 && skills.some(s => s.skill_name) && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.9rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '6px', paddingBottom: '3px', borderBottom: `1px solid ${colors.primaryColor}` }}>SKILLS</h2>
                        <p style={{ fontSize: '0.88rem', margin: 0 }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                      </div>
                    )}
                    {projects.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '0.9rem', color: colors.primaryColor, fontWeight: 700, marginBottom: '6px', paddingBottom: '3px', borderBottom: `1px solid ${colors.primaryColor}` }}>PROJECTS</h2>
                        {projects.map((proj) => (
                          <div key={proj.id} style={{ marginBottom: '8px' }}>
                            <strong style={{ fontSize: '0.92rem' }}>{proj.project_name || 'Project'}</strong>
                            {proj.organization && <span style={{ fontSize: '0.82rem', color: '#666' }}> -{proj.organization}</span>}
                            {proj.description && <p style={{ fontSize: '0.85rem', margin: '2px 0 0', color: '#333' }}>{proj.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                      <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                    )}
                  </div>
                </div>
              );
            }

            // ============================================
            // FALLBACK - Default to Harvard style
            // ============================================
            return (
              <div className={styles.resumePreview} style={{
                fontFamily: serifFont,
                padding: '48px',
                lineHeight: 1.4,
                color: '#000',
                backgroundColor: '#fff',
              }}>
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <h1 style={{ fontSize: '1.9rem', fontWeight: 700, margin: 0, color: '#000' }}>{fullName}</h1>
                </div>
                <div style={{
                  textAlign: 'center',
                  fontSize: '0.85rem',
                  color: '#333',
                  marginBottom: '20px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid #000',
                }}>
                  {contactParts.length > 0 ? contactParts.join('  |  ') : 'email@example.com  |  (555) 123-4567  |  City, State'}
                </div>
                {experience.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '10px', color: '#000' }}>Experience</h2>
                    {experience.map((exp) => (
                      <div key={exp.id} style={{ marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{exp.job_title || 'Job Title'}</strong>
                          <span style={{ fontSize: '0.85rem' }}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>{exp.company_name}{exp.location ? `, ${exp.location}` : ''}</div>
                        {exp.description && (
                          <ul style={{ margin: '4px 0 0 16px', paddingLeft: 0, listStylePosition: 'outside' }}>
                            {exp.description.split('\n').filter(Boolean).map((line, i) => (
                              <li key={i} style={{ fontSize: '0.85rem', color: '#333', marginBottom: '2px' }}>{line.replace(/^[-â€¢]\s*/, '')}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {education.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '10px', color: '#000' }}>Education</h2>
                    {education.map((edu) => (
                      <div key={edu.id} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{edu.school_name || 'School Name'}</strong>
                          <span style={{ fontSize: '0.85rem' }}>{edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}</span>
                        </div>
                        {(edu.degree || edu.field_of_study) && (
                          <div style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa && ` | GPA: ${edu.gpa}`}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {skills.length > 0 && skills.some(s => s.skill_name) && (
                  <div>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '10px', color: '#000' }}>Skills</h2>
                    <p style={{ fontSize: '0.9rem', margin: 0 }}>{skills.filter(s => s.skill_name).map(s => s.skill_name).join(', ')}</p>
                  </div>
                )}
                {!personalInfo.summary && education.length === 0 && experience.length === 0 && skills.length === 0 && projects.length === 0 && (
                  <div className={styles.previewEmpty}><p>Start filling out the form to see your resume preview</p></div>
                )}
              </div>
            );
          })()}
        </div>
      </div>


      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <TemplateGallery
          currentTemplate={resume.template || 'clean'}
          isPro={isPro}
          onSelect={handleUpdateTemplate}
          onClose={() => setShowTemplateGallery(false)}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Upgrade to Pro"
        message={upgradeMessage}
      />

      {/* Photo Cropper Modal */}
      <PhotoCropper
        isOpen={showPhotoCropper}
        onClose={() => setShowPhotoCropper(false)}
        onSave={handlePhotoSave}
      />

      {/* AI Modal (Bullets or Summary) */}
      {aiModalOpen && (
        <div className={styles.modalOverlay} onClick={closeAiModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <svg className={styles.sparkle} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                {aiModalMode === 'summary' ? 'AI Summary Generator' : 'AI Bullet Generator'}
              </h3>
              <button onClick={closeAiModal} className={styles.modalClose}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {aiUsage && (
              <div className={styles.aiUsageBar}>
                <span className={styles.aiUsageText}>
                  {aiUsage.isPro ? (
                    <>Pro: {aiUsage.remaining} of {aiUsage.limit} generations left this month</>
                  ) : (
                    <>{aiUsage.remaining} of {aiUsage.limit} free generations left</>
                  )}
                </span>
                <div className={styles.aiUsageProgress}>
                  <div
                    className={styles.aiUsageProgressFill}
                    style={{ width: `${(aiUsage.remaining / aiUsage.limit) * 100}%` }}
                  />
                </div>
              </div>
            )}

            <div className={styles.modalBody}>
              {aiModalMode === 'summary' ? (
                /* Summary Mode */
                !aiGeneratedSummary ? (
                  <>
                    <p className={styles.modalHint}>
                      Generate a professional summary based on your education, experience, skills, and projects.
                    </p>
                    <div className={styles.summaryPreview}>
                      <p><strong>Education:</strong> {education.length > 0 ? education.map(e => e.school_name || 'School').join(', ') : 'None added'}</p>
                      <p><strong>Experience:</strong> {experience.length > 0 ? experience.map(e => e.job_title || 'Job').join(', ') : 'None added'}</p>
                      <p><strong>Skills:</strong> {skills.filter(s => s.skill_name).length > 0 ? skills.filter(s => s.skill_name).map(s => s.skill_name).slice(0, 5).join(', ') + (skills.length > 5 ? '...' : '') : 'None added'}</p>
                      <p><strong>Projects:</strong> {projects.length > 0 ? projects.map(p => p.project_name || 'Project').join(', ') : 'None added'}</p>
                    </div>
                    {aiError && <p className={styles.modalError}>{aiError}</p>}
                    <button
                      onClick={handleGenerateSummary}
                      disabled={aiGenerating}
                      className={styles.modalGenerateButton}
                    >
                      {aiGenerating ? (
                        <>
                          <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className={styles.sparkle} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          Generate Summary
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <p className={styles.modalHint}>Here is your professional summary:</p>
                    <div className={styles.generatedBullets}>
                      <p className={styles.summaryText}>{aiGeneratedSummary}</p>
                    </div>
                    <div className={styles.modalActions}>
                      <button onClick={handleAcceptSummary} className={styles.acceptButton}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Accept
                      </button>
                      <button onClick={() => setAiGeneratedSummary(null)} className={styles.regenerateButton}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 4v6h-6M1 20v-6h6" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        Regenerate
                      </button>
                      <button onClick={closeAiModal} className={styles.cancelButton}>
                        Cancel
                      </button>
                    </div>
                  </>
                )
              ) : (
                /* Bullets Mode */
                !aiGeneratedBullets ? (
                  <>
                    <p className={styles.modalHint}>
                      Describe what you did in plain English. Be specific about your tasks and any results.
                    </p>
                    <textarea
                      className={styles.modalTextarea}
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      placeholder="Example: I helped customers at the register, restocked shelves, and trained 2 new employees on the POS system"
                      rows={5}
                      disabled={aiGenerating}
                    />
                    {aiError && <p className={styles.modalError}>{aiError}</p>}
                    <button
                      onClick={handleGenerateBullets}
                      disabled={aiGenerating || !aiDescription.trim()}
                      className={styles.modalGenerateButton}
                    >
                      {aiGenerating ? (
                        <>
                          <svg className={styles.spinner} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className={styles.sparkle} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          Generate Bullets
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <p className={styles.modalHint}>Here are your professional bullet points:</p>
                    <div className={styles.generatedBullets}>
                      {aiGeneratedBullets.split('\n').filter(line => line.trim()).map((line, i) => (
                        <p key={i} className={styles.bulletLine}>{line}</p>
                      ))}
                    </div>
                    <div className={styles.modalActions}>
                      <button onClick={handleAcceptBullets} className={styles.acceptButton}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Accept
                      </button>
                      <button onClick={() => { setAiGeneratedBullets(null); setAiDescription(''); }} className={styles.regenerateButton}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M23 4v6h-6M1 20v-6h6" />
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                        </svg>
                        Regenerate
                      </button>
                      <button onClick={closeAiModal} className={styles.cancelButton}>
                        Cancel
                      </button>
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
