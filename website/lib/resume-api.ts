// Resume API client for browser-side calls

function getApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('ltgv_api_key');
}

async function apiCall(endpoint: string, options: RequestInit = {}) {
  const apiKey = getApiKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  // Include API key if available
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  const response = await fetch(`/api/resume${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    // Include the error code for special handling (RESUME_LIMIT, JOB_LIMIT, etc.)
    const errorMessage = error.message || error.error || 'API error';
    const err = new Error(errorMessage);
    (err as any).code = error.error;
    throw err;
  }

  return response.json();
}

// List all resumes
export async function listResumes() {
  return apiCall('/list');
}

// Create new resume
export async function createResume(title?: string) {
  return apiCall('/create', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

// Get full resume data
export async function getResume(id: string) {
  return apiCall(`/${id}`);
}

// Update resume title/template
export async function updateResume(id: string, data: { title?: string; template?: string }) {
  return apiCall(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ data }),
  });
}

// Delete resume
export async function deleteResume(id: string) {
  return apiCall(`/${id}`, {
    method: 'DELETE',
  });
}

// Update section data
export async function updateSection(
  resumeId: string,
  section: 'personalInfo' | 'education' | 'experience' | 'skills' | 'projects',
  data: any
) {
  return apiCall(`/${resumeId}`, {
    method: 'PUT',
    body: JSON.stringify({ section, data }),
  });
}

// Delete item from section
export async function deleteFromSection(
  resumeId: string,
  section: 'education' | 'experience' | 'skills' | 'projects',
  itemId: string
) {
  return apiCall(`/${resumeId}`, {
    method: 'DELETE',
    body: JSON.stringify({ section, itemId }),
  });
}
