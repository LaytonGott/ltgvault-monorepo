'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ==========================================
// CLEAN TEMPLATE STYLES
// ==========================================
const cleanStyles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 9,
    color: '#555',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  contactItem: {
    marginRight: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#1a1a1a',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333',
  },
  entry: {
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  entryDate: {
    fontSize: 9,
    color: '#666',
  },
  entrySubtitle: {
    fontSize: 10,
    color: '#555',
    marginBottom: 4,
  },
  entryDescription: {
    fontSize: 10,
    color: '#444',
    lineHeight: 1.5,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 3,
    fontSize: 9,
    color: '#333',
    marginRight: 6,
    marginBottom: 4,
  },
});

// ==========================================
// MODERN TEMPLATE STYLES (Two-column)
// ==========================================
const modernStyles = StyleSheet.create({
  page: {
    flexDirection: 'row',
    fontFamily: 'Helvetica',
  },
  sidebar: {
    width: '32%',
    backgroundColor: '#0f4c5c',
    padding: 28,
    color: '#ffffff',
  },
  main: {
    width: '68%',
    padding: 32,
    backgroundColor: '#ffffff',
    color: '#1a1a1a',
  },
  sidebarName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  sidebarSection: {
    marginTop: 20,
  },
  sidebarSectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: '#5fb5c8',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  contactItem: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  skillChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
    fontSize: 8,
    color: '#ffffff',
    marginRight: 4,
    marginBottom: 4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mainSection: {
    marginBottom: 18,
  },
  mainSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#0f4c5c',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottomWidth: 2,
    borderBottomColor: '#0f4c5c',
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#444',
  },
  entry: {
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  entryDate: {
    fontSize: 9,
    color: '#0f4c5c',
    fontWeight: 'bold',
  },
  entrySubtitle: {
    fontSize: 10,
    color: '#555',
    marginBottom: 4,
  },
  entryDescription: {
    fontSize: 10,
    color: '#444',
    lineHeight: 1.5,
  },
});

// ==========================================
// TYPES
// ==========================================
interface PersonalInfo {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin_url?: string;
  website_url?: string;
  summary?: string;
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

interface ResumePDFProps {
  template: 'clean' | 'modern';
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
}

// ==========================================
// CLEAN TEMPLATE COMPONENT
// ==========================================
function CleanTemplate({ personalInfo, education, experience, skills, projects }: Omit<ResumePDFProps, 'template'>) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  return (
    <Page size="LETTER" style={cleanStyles.page}>
      <Text style={cleanStyles.name}>{fullName}</Text>

      <View style={cleanStyles.contactRow}>
        {contactItems.map((item, index) => (
          <Text key={index} style={cleanStyles.contactItem}>{item}</Text>
        ))}
        {contactItems.length === 0 && (
          <Text style={cleanStyles.contactItem}>email@example.com | (555) 123-4567</Text>
        )}
      </View>

      {personalInfo.summary && (
        <View style={cleanStyles.section}>
          <Text style={cleanStyles.sectionTitle}>Summary</Text>
          <Text style={cleanStyles.summaryText}>{personalInfo.summary}</Text>
        </View>
      )}

      {education.length > 0 && (
        <View style={cleanStyles.section}>
          <Text style={cleanStyles.sectionTitle}>Education</Text>
          {education.map((edu) => (
            <View key={edu.id} style={cleanStyles.entry}>
              <View style={cleanStyles.entryHeader}>
                <Text style={cleanStyles.entryTitle}>{edu.school_name || 'School Name'}</Text>
                <Text style={cleanStyles.entryDate}>
                  {edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}
                </Text>
              </View>
              {(edu.degree || edu.field_of_study) && (
                <Text style={cleanStyles.entrySubtitle}>
                  {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                  {edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
                </Text>
              )}
              {edu.achievements && <Text style={cleanStyles.entryDescription}>{edu.achievements}</Text>}
            </View>
          ))}
        </View>
      )}

      {experience.length > 0 && (
        <View style={cleanStyles.section}>
          <Text style={cleanStyles.sectionTitle}>Experience</Text>
          {experience.map((exp) => (
            <View key={exp.id} style={cleanStyles.entry}>
              <View style={cleanStyles.entryHeader}>
                <Text style={cleanStyles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                <Text style={cleanStyles.entryDate}>
                  {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                </Text>
              </View>
              <Text style={cleanStyles.entrySubtitle}>
                {exp.company_name}{exp.location ? ` | ${exp.location}` : ''}
              </Text>
              {exp.description && <Text style={cleanStyles.entryDescription}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {skills.length > 0 && skills.some(s => s.skill_name) && (
        <View style={cleanStyles.section}>
          <Text style={cleanStyles.sectionTitle}>Skills</Text>
          <View style={cleanStyles.skillsContainer}>
            {skills.filter(s => s.skill_name).map((skill) => (
              <Text key={skill.id} style={cleanStyles.skillChip}>{skill.skill_name}</Text>
            ))}
          </View>
        </View>
      )}

      {projects.length > 0 && (
        <View style={cleanStyles.section}>
          <Text style={cleanStyles.sectionTitle}>Projects & Activities</Text>
          {projects.map((project) => (
            <View key={project.id} style={cleanStyles.entry}>
              <View style={cleanStyles.entryHeader}>
                <Text style={cleanStyles.entryTitle}>{project.project_name || 'Project Name'}</Text>
                {project.role && <Text style={cleanStyles.entryDate}>{project.role}</Text>}
              </View>
              {project.organization && <Text style={cleanStyles.entrySubtitle}>{project.organization}</Text>}
              {project.description && <Text style={cleanStyles.entryDescription}>{project.description}</Text>}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ==========================================
// MODERN TEMPLATE COMPONENT
// ==========================================
function ModernTemplate({ personalInfo, education, experience, skills, projects }: Omit<ResumePDFProps, 'template'>) {
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  return (
    <Page size="LETTER" style={modernStyles.page}>
      {/* Sidebar */}
      <View style={modernStyles.sidebar}>
        <Text style={modernStyles.sidebarName}>{personalInfo.first_name || 'Your'}</Text>
        <Text style={modernStyles.sidebarName}>{personalInfo.last_name || 'Name'}</Text>

        <View style={modernStyles.sidebarSection}>
          <Text style={modernStyles.sidebarSectionTitle}>Contact</Text>
          {contactItems.map((item, index) => (
            <Text key={index} style={modernStyles.contactItem}>{item}</Text>
          ))}
          {contactItems.length === 0 && (
            <Text style={modernStyles.contactItem}>email@example.com</Text>
          )}
        </View>

        {skills.length > 0 && skills.some(s => s.skill_name) && (
          <View style={modernStyles.sidebarSection}>
            <Text style={modernStyles.sidebarSectionTitle}>Skills</Text>
            <View style={modernStyles.skillsContainer}>
              {skills.filter(s => s.skill_name).map((skill) => (
                <Text key={skill.id} style={modernStyles.skillChip}>{skill.skill_name}</Text>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Main Content */}
      <View style={modernStyles.main}>
        {personalInfo.summary && (
          <View style={modernStyles.mainSection}>
            <Text style={modernStyles.mainSectionTitle}>Summary</Text>
            <Text style={modernStyles.summaryText}>{personalInfo.summary}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={modernStyles.mainSection}>
            <Text style={modernStyles.mainSectionTitle}>Experience</Text>
            {experience.map((exp) => (
              <View key={exp.id} style={modernStyles.entry}>
                <View style={modernStyles.entryHeader}>
                  <Text style={modernStyles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                  <Text style={modernStyles.entryDate}>
                    {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                  </Text>
                </View>
                <Text style={modernStyles.entrySubtitle}>
                  {exp.company_name}{exp.location ? ` | ${exp.location}` : ''}
                </Text>
                {exp.description && <Text style={modernStyles.entryDescription}>{exp.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={modernStyles.mainSection}>
            <Text style={modernStyles.mainSectionTitle}>Education</Text>
            {education.map((edu) => (
              <View key={edu.id} style={modernStyles.entry}>
                <View style={modernStyles.entryHeader}>
                  <Text style={modernStyles.entryTitle}>{edu.school_name || 'School Name'}</Text>
                  <Text style={modernStyles.entryDate}>
                    {edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}
                  </Text>
                </View>
                {(edu.degree || edu.field_of_study) && (
                  <Text style={modernStyles.entrySubtitle}>
                    {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                    {edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
                  </Text>
                )}
                {edu.achievements && <Text style={modernStyles.entryDescription}>{edu.achievements}</Text>}
              </View>
            ))}
          </View>
        )}

        {projects.length > 0 && (
          <View style={modernStyles.mainSection}>
            <Text style={modernStyles.mainSectionTitle}>Projects & Activities</Text>
            {projects.map((project) => (
              <View key={project.id} style={modernStyles.entry}>
                <View style={modernStyles.entryHeader}>
                  <Text style={modernStyles.entryTitle}>{project.project_name || 'Project Name'}</Text>
                  {project.role && <Text style={modernStyles.entryDate}>{project.role}</Text>}
                </View>
                {project.organization && <Text style={modernStyles.entrySubtitle}>{project.organization}</Text>}
                {project.description && <Text style={modernStyles.entryDescription}>{project.description}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ResumePDF({ template, personalInfo, education, experience, skills, projects }: ResumePDFProps) {
  return (
    <Document>
      {template === 'modern' ? (
        <ModernTemplate
          personalInfo={personalInfo}
          education={education}
          experience={experience}
          skills={skills}
          projects={projects}
        />
      ) : (
        <CleanTemplate
          personalInfo={personalInfo}
          education={education}
          experience={experience}
          skills={skills}
          projects={projects}
        />
      )}
    </Document>
  );
}

// Helper function to generate filename
export function getResumeFilename(personalInfo: PersonalInfo): string {
  const firstName = personalInfo.first_name?.trim();
  const lastName = personalInfo.last_name?.trim();

  if (firstName && lastName) {
    return `${firstName}_${lastName}_Resume.pdf`;
  } else if (firstName || lastName) {
    return `${firstName || lastName}_Resume.pdf`;
  }
  return 'Resume.pdf';
}
