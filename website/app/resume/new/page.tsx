'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function NewResumePage() {
  const router = useRouter();

  useEffect(() => {
    async function createAndRedirect() {
      const userId = localStorage.getItem('ltgv_user_id');

      if (!userId) {
        window.location.href = '/dashboard.html';
        return;
      }

      try {
        const { data, error } = await supabase
          .from('resumes')
          .insert({
            user_id: userId,
            title: 'Untitled Resume',
            template: 'clean'
          })
          .select()
          .single();

        if (error) throw error;
        router.replace(`/resume/${data.id}`);
      } catch (err) {
        console.error('Failed to create resume:', err);
        router.replace('/resume');
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
