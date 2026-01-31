import { createClient } from '@supabase/supabase-js';

// Browser-side Supabase client (uses anon key, not service role)
// RLS policies will control access

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types for resume data
export interface Resume {
  id: string;
  user_id: string;
  title: string;
  template: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface PersonalInfo {
  id: string;
  resume_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  summary: string | null;
}

export interface Education {
  id: string;
  resume_id: string;
  school_name: string;
  degree: string | null;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  gpa: string | null;
  achievements: string | null;
  sort_order: number;
}

export interface Experience {
  id: string;
  resume_id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  experience_type: string;
  description: string | null;
  sort_order: number;
}

export interface Skill {
  id: string;
  resume_id: string;
  skill_name: string;
  skill_category: string | null;
  proficiency_level: string | null;
  sort_order: number;
}

export interface Project {
  id: string;
  resume_id: string;
  project_name: string;
  project_type: string;
  organization: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
  project_url: string | null;
  sort_order: number;
}

export interface ResumeData {
  resume: Resume;
  personalInfo: PersonalInfo | null;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
}
