// Resume by ID API - GET, PUT, DELETE
const { supabase } = require('../../lib/supabase');
const { validateApiKey } = require('../../lib/auth');

async function getUser(req) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return null;
  const user = await validateApiKey(apiKey);
  return user || null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  try {
    const user = await getUser(req);
    if (!user) {
      return res.status(401).json({ error: 'API key required' });
    }

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: 'Resume ID required' });
    }
    // GET - Fetch resume with all sections
    if (req.method === 'GET') {
      const { data: resume, error } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !resume) {
        return res.status(404).json({ error: 'Resume not found' });
      }

      // Fetch all related sections in parallel
      const [pi, edu, exp, skills, proj] = await Promise.all([
        supabase.from('resume_personal_info').select('*').eq('resume_id', id).single(),
        supabase.from('resume_education').select('*').eq('resume_id', id).order('sort_order'),
        supabase.from('resume_experience').select('*').eq('resume_id', id).order('sort_order'),
        supabase.from('resume_skills').select('*').eq('resume_id', id).order('sort_order'),
        supabase.from('resume_projects').select('*').eq('resume_id', id).order('sort_order')
      ]);

      return res.status(200).json({
        resume,
        personalInfo: pi.data,
        education: edu.data || [],
        experience: exp.data || [],
        skills: skills.data || [],
        projects: proj.data || []
      });
    }

    // PUT - Update resume or section
    if (req.method === 'PUT') {
      const body = req.body || {};
      const { section, data } = body;

      if (!section) {
        // Update resume metadata (title, template)
        await supabase
          .from('resumes')
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', id)
          .eq('user_id', user.id);
        return res.status(200).json({ success: true });
      }

      // Update specific section
      const tables = {
        personalInfo: 'resume_personal_info',
        education: 'resume_education',
        experience: 'resume_experience',
        skills: 'resume_skills',
        projects: 'resume_projects'
      };

      const table = tables[section];
      if (!table) {
        return res.status(400).json({ error: 'Invalid section' });
      }

      if (section === 'personalInfo') {
        const { data: existing } = await supabase
          .from(table)
          .select('id')
          .eq('resume_id', id)
          .single();

        if (existing) {
          await supabase
            .from(table)
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('resume_id', id);
        } else {
          await supabase
            .from(table)
            .insert({ resume_id: id, ...data });
        }
      } else if (data.id) {
        // Update existing item
        await supabase
          .from(table)
          .update({ ...data, updated_at: new Date().toISOString() })
          .eq('id', data.id);
      } else {
        // Insert new item
        const result = await supabase
          .from(table)
          .insert({ resume_id: id, ...data })
          .select()
          .single();
        return res.status(200).json({ success: true, item: result.data });
      }

      // Update resume timestamp
      await supabase
        .from('resumes')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', id);

      return res.status(200).json({ success: true });
    }

    // DELETE - Delete resume or section item
    if (req.method === 'DELETE') {
      const body = req.body || {};

      if (body.section && body.itemId) {
        // Delete item from section
        const tables = {
          education: 'resume_education',
          experience: 'resume_experience',
          skills: 'resume_skills',
          projects: 'resume_projects'
        };
        const table = tables[body.section];
        if (table) {
          await supabase.from(table).delete().eq('id', body.itemId);
        }
        return res.status(200).json({ success: true });
      }

      // Delete entire resume
      await supabase
        .from('resumes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Resume API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};
