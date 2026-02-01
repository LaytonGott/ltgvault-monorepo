'use client';

export const dynamic = 'force-dynamic';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createResume } from '@/lib/resume-api';

export default function NewResumePage() {
  const router = useRouter();

  useEffect(() => {
    async function createAndRedirect() {
      const apiKey = localStorage.getItem('ltgv_api_key');

      if (!apiKey) {
        window.location.href = '/dashboard.html';
        return;
      }

      try {
        const { resume } = await createResume();
        router.replace(`/resume/${resume.id}`);
      } catch (err: any) {
        console.error('Failed to create resume:', err.code, err.message);
        // Pass error info to the resume page so it can show the appropriate message
        if (err.code === 'RESUME_LIMIT') {
          router.replace('/resume?limit=true');
        } else {
          router.replace('/resume?error=' + encodeURIComponent(err.message || 'Failed to create resume'));
        }
      }
    }

    createAndRedirect();
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#999'
    }}>
      Creating resume...
    </div>
  );
}
