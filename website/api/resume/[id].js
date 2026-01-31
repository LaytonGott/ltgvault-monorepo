const { supabase } = require('../../lib/supabase');
const { validateApiKey } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    const user = await validateApiKey(apiKey);
    if (!user) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Extract resume ID from URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const resumeId = pathParts[pathParts.length - 1];

    if (!resumeId || resumeId === '[id]') {
      return res.status(400).json({ error: 'Resume ID required' });
    }

    // Verify user owns this resume
    const { data: resume, error: resumeError } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .single();

    if (resumeError || !resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // GET - Load full resume with all sections
    if (req.method === 'GET') {
      const [personalInfo, education, experience, skills, projects] = await Promise.all([
        supabase.from('resume_personal_info').select('*').eq('resume_id', resumeId).single(),
        supabase.from('resume_education').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_experience').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_skills').select('*').eq('resume_id', resumeId).order('sort_order'),
        supabase.from('resume_projects').select('*').eq('resume_id', resumeId).order('sort_order')
      ]);

      return res.status(200).json({
        resume,
        personalInfo: personalInfo.data,
        education: education.data || [],
        experience: experience.data || [],
        skills: skills.data || [],
        projects: projects.data || []
      });
    }

    // PUT - Update resume or sections
    if (req.method === 'PUT') {
      const { section, data } = req.body;

      if (!section) {
        // Update resume itself
        const { error } = await supabase
          .from('resumes')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', resumeId);

        if (error) throw error;
        return res.status(200).json({ success: true });
      }

      // Update specific section
      const tableMap = {
        personalInfo: 'resume_personal_info',
        education: 'resume_education',
        experience: 'resume_experience',
        skills: 'resume_skills',
        projects: 'resume_projects'
      };

      const table = tableMap[section];
      if (!table) {
        return res.status(400).json({ error: 'Invalid section' });
      }

      // Handle personal info (single record)
      if (section === 'personalInfo') {
        const { data: existing } = await supabase
          .from(table)
          .select('id')
          .eq('resume_id', resumeId)
          .single();

        if (existing) {
          await supabase
            .from(table)
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('resume_id', resumeId);
        } else {
          await supabase
            .from(table)
            .insert({ resume_id: resumeId, ...data });
        }
      } else {
        // Handle array sections (education, experience, etc.)
        if (data.id) {
          // Update existing
          const { id, ...updateData } = data;
          await supabase
            .from(table)
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id);
        } else {
          // Insert new
          await supabase
            .from(table)
            .insert({ resume_id: resumeId, ...data });
        }
      }

      // Update resume timestamp
      await supabase
        .from('resumes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', resumeId);

      return res.status(200).json({ success: true });
    }

    // DELETE - Delete resume
    if (req.method === 'DELETE') {
      const { section, itemId } = req.body || {};

      if (section && itemId) {
        // Delete specific item from section
        const tableMap = {
          education: 'resume_education',
          experience: 'resume_experience',
          skills: 'resume_skills',
          projects: 'resume_projects'
        };

        const table = tableMap[section];
        if (!table) {
          return res.status(400).json({ error: 'Invalid section' });
        }

        await supabase.from(table).delete().eq('id', itemId);
        return res.status(200).json({ success: true });
      }

      // Delete entire resume (cascades to all sections)
      const { error } = await supabase
        .from('resumes')
        .delete()
        .eq('id', resumeId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Resume API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
