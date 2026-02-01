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
// PROFESSIONAL TEMPLATE STYLES (Traditional/Corporate)
// ==========================================
const professionalStyles = StyleSheet.create({
  page: {
    padding: 54,
    fontSize: 10,
    fontFamily: 'Times-Roman',
    color: '#222',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    fontSize: 10,
    color: '#444',
    marginBottom: 20,
  },
  contactItem: {
    marginHorizontal: 8,
  },
  separator: {
    color: '#888',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Times-Bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#222',
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#333',
    fontFamily: 'Times-Roman',
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
    fontFamily: 'Times-Bold',
  },
  entryDate: {
    fontSize: 10,
    color: '#444',
    fontFamily: 'Times-Italic',
  },
  entrySubtitle: {
    fontSize: 10,
    color: '#444',
    fontFamily: 'Times-Italic',
    marginBottom: 3,
  },
  entryDescription: {
    fontSize: 10,
    color: '#333',
    lineHeight: 1.5,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillItem: {
    fontSize: 10,
    color: '#333',
    marginRight: 4,
  },
});

// ==========================================
// BOLD TEMPLATE STYLES (Eye-catching)
// ==========================================
const boldStyles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 32,
    paddingBottom: 24,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 1,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  contactItem: {
    marginRight: 16,
  },
  body: {
    padding: 32,
    paddingTop: 24,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
    marginHorizontal: -10,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: '#333',
  },
  entry: {
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  entryDate: {
    fontSize: 9,
    color: '#2563eb',
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
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  skillChip: {
    backgroundColor: '#2563eb',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 3,
    fontSize: 9,
    color: '#ffffff',
    marginRight: 6,
    marginBottom: 4,
  },
});

// ==========================================
// MINIMAL TEMPLATE STYLES (Clean/Creative)
// ==========================================
const minimalStyles = StyleSheet.create({
  page: {
    padding: 56,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 3,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 9,
    color: '#666',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd',
  },
  contactItem: {
    marginRight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: '#999',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.7,
    color: '#444',
  },
  entry: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  entryLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  entryTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  entryDate: {
    fontSize: 9,
    color: '#888',
  },
  entrySubtitle: {
    fontSize: 10,
    color: '#666',
    marginBottom: 6,
  },
  entryDescription: {
    fontSize: 10,
    color: '#444',
    lineHeight: 1.6,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillItem: {
    fontSize: 10,
    color: '#555',
    marginRight: 4,
  },
});

// ==========================================
// COMPACT TEMPLATE STYLES (Dense/Experienced)
// ==========================================
const compactStyles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1a1a1a',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    fontSize: 8,
    color: '#555',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  contactItem: {
    marginRight: 10,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#1a1a1a',
    marginBottom: 4,
    backgroundColor: '#f0f0f0',
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  summaryText: {
    fontSize: 9,
    lineHeight: 1.4,
    color: '#333',
  },
  entry: {
    marginBottom: 6,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 1,
  },
  entryTitle: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  entryDate: {
    fontSize: 8,
    color: '#666',
  },
  entrySubtitle: {
    fontSize: 8,
    color: '#555',
    marginBottom: 2,
  },
  entryDescription: {
    fontSize: 8,
    color: '#444',
    lineHeight: 1.4,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skillChip: {
    backgroundColor: '#e8e8e8',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    fontSize: 8,
    color: '#333',
    marginRight: 4,
    marginBottom: 3,
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
  template: 'clean' | 'modern' | 'professional' | 'bold' | 'minimal' | 'compact';
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
// PROFESSIONAL TEMPLATE COMPONENT
// ==========================================
function ProfessionalTemplate({ personalInfo, education, experience, skills, projects }: Omit<ResumePDFProps, 'template'>) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  return (
    <Page size="LETTER" style={professionalStyles.page}>
      <Text style={professionalStyles.name}>{fullName}</Text>

      <View style={professionalStyles.contactRow}>
        {contactItems.map((item, index) => (
          <View key={index} style={{ flexDirection: 'row' }}>
            {index > 0 && <Text style={professionalStyles.separator}> | </Text>}
            <Text style={professionalStyles.contactItem}>{item}</Text>
          </View>
        ))}
      </View>

      {personalInfo.summary && (
        <View style={professionalStyles.section}>
          <Text style={professionalStyles.sectionTitle}>Professional Summary</Text>
          <Text style={professionalStyles.summaryText}>{personalInfo.summary}</Text>
        </View>
      )}

      {experience.length > 0 && (
        <View style={professionalStyles.section}>
          <Text style={professionalStyles.sectionTitle}>Professional Experience</Text>
          {experience.map((exp) => (
            <View key={exp.id} style={professionalStyles.entry}>
              <View style={professionalStyles.entryHeader}>
                <Text style={professionalStyles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                <Text style={professionalStyles.entryDate}>
                  {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                </Text>
              </View>
              <Text style={professionalStyles.entrySubtitle}>
                {exp.company_name}{exp.location ? `, ${exp.location}` : ''}
              </Text>
              {exp.description && <Text style={professionalStyles.entryDescription}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {education.length > 0 && (
        <View style={professionalStyles.section}>
          <Text style={professionalStyles.sectionTitle}>Education</Text>
          {education.map((edu) => (
            <View key={edu.id} style={professionalStyles.entry}>
              <View style={professionalStyles.entryHeader}>
                <Text style={professionalStyles.entryTitle}>{edu.school_name || 'School Name'}</Text>
                <Text style={professionalStyles.entryDate}>
                  {edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}
                </Text>
              </View>
              {(edu.degree || edu.field_of_study) && (
                <Text style={professionalStyles.entrySubtitle}>
                  {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                  {edu.gpa ? ` — GPA: ${edu.gpa}` : ''}
                </Text>
              )}
              {edu.achievements && <Text style={professionalStyles.entryDescription}>{edu.achievements}</Text>}
            </View>
          ))}
        </View>
      )}

      {skills.length > 0 && skills.some(s => s.skill_name) && (
        <View style={professionalStyles.section}>
          <Text style={professionalStyles.sectionTitle}>Skills</Text>
          <View style={professionalStyles.skillsContainer}>
            {skills.filter(s => s.skill_name).map((skill, index, arr) => (
              <Text key={skill.id} style={professionalStyles.skillItem}>
                {skill.skill_name}{index < arr.length - 1 ? ' • ' : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      {projects.length > 0 && (
        <View style={professionalStyles.section}>
          <Text style={professionalStyles.sectionTitle}>Projects & Activities</Text>
          {projects.map((project) => (
            <View key={project.id} style={professionalStyles.entry}>
              <View style={professionalStyles.entryHeader}>
                <Text style={professionalStyles.entryTitle}>{project.project_name || 'Project Name'}</Text>
                {project.role && <Text style={professionalStyles.entryDate}>{project.role}</Text>}
              </View>
              {project.organization && <Text style={professionalStyles.entrySubtitle}>{project.organization}</Text>}
              {project.description && <Text style={professionalStyles.entryDescription}>{project.description}</Text>}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ==========================================
// BOLD TEMPLATE COMPONENT
// ==========================================
function BoldTemplate({ personalInfo, education, experience, skills, projects }: Omit<ResumePDFProps, 'template'>) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  return (
    <Page size="LETTER" style={boldStyles.page}>
      <View style={boldStyles.header}>
        <Text style={boldStyles.name}>{fullName}</Text>
        <View style={boldStyles.contactRow}>
          {contactItems.map((item, index) => (
            <Text key={index} style={boldStyles.contactItem}>{item}</Text>
          ))}
        </View>
      </View>

      <View style={boldStyles.body}>
        {personalInfo.summary && (
          <View style={boldStyles.section}>
            <Text style={boldStyles.sectionTitle}>About Me</Text>
            <Text style={boldStyles.summaryText}>{personalInfo.summary}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={boldStyles.section}>
            <Text style={boldStyles.sectionTitle}>Work Experience</Text>
            {experience.map((exp) => (
              <View key={exp.id} style={boldStyles.entry}>
                <View style={boldStyles.entryHeader}>
                  <Text style={boldStyles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                  <Text style={boldStyles.entryDate}>
                    {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                  </Text>
                </View>
                <Text style={boldStyles.entrySubtitle}>
                  {exp.company_name}{exp.location ? ` • ${exp.location}` : ''}
                </Text>
                {exp.description && <Text style={boldStyles.entryDescription}>{exp.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={boldStyles.section}>
            <Text style={boldStyles.sectionTitle}>Education</Text>
            {education.map((edu) => (
              <View key={edu.id} style={boldStyles.entry}>
                <View style={boldStyles.entryHeader}>
                  <Text style={boldStyles.entryTitle}>{edu.school_name || 'School Name'}</Text>
                  <Text style={boldStyles.entryDate}>
                    {edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}
                  </Text>
                </View>
                {(edu.degree || edu.field_of_study) && (
                  <Text style={boldStyles.entrySubtitle}>
                    {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                    {edu.gpa ? ` • GPA: ${edu.gpa}` : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && skills.some(s => s.skill_name) && (
          <View style={boldStyles.section}>
            <Text style={boldStyles.sectionTitle}>Skills</Text>
            <View style={boldStyles.skillsContainer}>
              {skills.filter(s => s.skill_name).map((skill) => (
                <Text key={skill.id} style={boldStyles.skillChip}>{skill.skill_name}</Text>
              ))}
            </View>
          </View>
        )}

        {projects.length > 0 && (
          <View style={boldStyles.section}>
            <Text style={boldStyles.sectionTitle}>Projects</Text>
            {projects.map((project) => (
              <View key={project.id} style={boldStyles.entry}>
                <View style={boldStyles.entryHeader}>
                  <Text style={boldStyles.entryTitle}>{project.project_name || 'Project Name'}</Text>
                  {project.role && <Text style={boldStyles.entryDate}>{project.role}</Text>}
                </View>
                {project.organization && <Text style={boldStyles.entrySubtitle}>{project.organization}</Text>}
                {project.description && <Text style={boldStyles.entryDescription}>{project.description}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}

// ==========================================
// MINIMAL TEMPLATE COMPONENT
// ==========================================
function MinimalTemplate({ personalInfo, education, experience, skills, projects }: Omit<ResumePDFProps, 'template'>) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  return (
    <Page size="LETTER" style={minimalStyles.page}>
      <Text style={minimalStyles.name}>{fullName}</Text>

      <View style={minimalStyles.contactRow}>
        {contactItems.map((item, index) => (
          <Text key={index} style={minimalStyles.contactItem}>{item}</Text>
        ))}
      </View>

      {personalInfo.summary && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Profile</Text>
          <Text style={minimalStyles.summaryText}>{personalInfo.summary}</Text>
        </View>
      )}

      {experience.length > 0 && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Experience</Text>
          {experience.map((exp, index) => (
            <View key={exp.id} style={[minimalStyles.entry, index === experience.length - 1 ? minimalStyles.entryLast : {}]}>
              <View style={minimalStyles.entryHeader}>
                <Text style={minimalStyles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                <Text style={minimalStyles.entryDate}>
                  {exp.start_date}{exp.end_date ? ` — ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                </Text>
              </View>
              <Text style={minimalStyles.entrySubtitle}>{exp.company_name}</Text>
              {exp.description && <Text style={minimalStyles.entryDescription}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {education.length > 0 && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Education</Text>
          {education.map((edu, index) => (
            <View key={edu.id} style={[minimalStyles.entry, index === education.length - 1 ? minimalStyles.entryLast : {}]}>
              <View style={minimalStyles.entryHeader}>
                <Text style={minimalStyles.entryTitle}>{edu.school_name || 'School Name'}</Text>
                <Text style={minimalStyles.entryDate}>
                  {edu.start_date}{edu.end_date ? ` — ${edu.is_current ? 'Present' : edu.end_date}` : ''}
                </Text>
              </View>
              {(edu.degree || edu.field_of_study) && (
                <Text style={minimalStyles.entrySubtitle}>
                  {edu.degree}{edu.field_of_study ? `, ${edu.field_of_study}` : ''}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {skills.length > 0 && skills.some(s => s.skill_name) && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Skills</Text>
          <View style={minimalStyles.skillsContainer}>
            {skills.filter(s => s.skill_name).map((skill, index, arr) => (
              <Text key={skill.id} style={minimalStyles.skillItem}>
                {skill.skill_name}{index < arr.length - 1 ? '  /  ' : ''}
              </Text>
            ))}
          </View>
        </View>
      )}

      {projects.length > 0 && (
        <View style={minimalStyles.section}>
          <Text style={minimalStyles.sectionTitle}>Projects</Text>
          {projects.map((project, index) => (
            <View key={project.id} style={[minimalStyles.entry, index === projects.length - 1 ? minimalStyles.entryLast : {}]}>
              <View style={minimalStyles.entryHeader}>
                <Text style={minimalStyles.entryTitle}>{project.project_name || 'Project Name'}</Text>
                {project.role && <Text style={minimalStyles.entryDate}>{project.role}</Text>}
              </View>
              {project.description && <Text style={minimalStyles.entryDescription}>{project.description}</Text>}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ==========================================
// COMPACT TEMPLATE COMPONENT
// ==========================================
function CompactTemplate({ personalInfo, education, experience, skills, projects }: Omit<ResumePDFProps, 'template'>) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  return (
    <Page size="LETTER" style={compactStyles.page}>
      <Text style={compactStyles.name}>{fullName}</Text>

      <View style={compactStyles.contactRow}>
        {contactItems.map((item, index) => (
          <Text key={index} style={compactStyles.contactItem}>{item}</Text>
        ))}
      </View>

      {personalInfo.summary && (
        <View style={compactStyles.section}>
          <Text style={compactStyles.sectionTitle}>Summary</Text>
          <Text style={compactStyles.summaryText}>{personalInfo.summary}</Text>
        </View>
      )}

      {experience.length > 0 && (
        <View style={compactStyles.section}>
          <Text style={compactStyles.sectionTitle}>Experience</Text>
          {experience.map((exp) => (
            <View key={exp.id} style={compactStyles.entry}>
              <View style={compactStyles.entryHeader}>
                <Text style={compactStyles.entryTitle}>{exp.job_title} — {exp.company_name}</Text>
                <Text style={compactStyles.entryDate}>
                  {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                </Text>
              </View>
              {exp.description && <Text style={compactStyles.entryDescription}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {education.length > 0 && (
        <View style={compactStyles.section}>
          <Text style={compactStyles.sectionTitle}>Education</Text>
          {education.map((edu) => (
            <View key={edu.id} style={compactStyles.entry}>
              <View style={compactStyles.entryHeader}>
                <Text style={compactStyles.entryTitle}>
                  {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''} — {edu.school_name}
                </Text>
                <Text style={compactStyles.entryDate}>
                  {edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {skills.length > 0 && skills.some(s => s.skill_name) && (
        <View style={compactStyles.section}>
          <Text style={compactStyles.sectionTitle}>Skills</Text>
          <View style={compactStyles.skillsContainer}>
            {skills.filter(s => s.skill_name).map((skill) => (
              <Text key={skill.id} style={compactStyles.skillChip}>{skill.skill_name}</Text>
            ))}
          </View>
        </View>
      )}

      {projects.length > 0 && (
        <View style={compactStyles.section}>
          <Text style={compactStyles.sectionTitle}>Projects</Text>
          {projects.map((project) => (
            <View key={project.id} style={compactStyles.entry}>
              <View style={compactStyles.entryHeader}>
                <Text style={compactStyles.entryTitle}>{project.project_name}</Text>
                {project.role && <Text style={compactStyles.entryDate}>{project.role}</Text>}
              </View>
              {project.description && <Text style={compactStyles.entryDescription}>{project.description}</Text>}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ResumePDF({ template, personalInfo, education, experience, skills, projects }: ResumePDFProps) {
  const templateProps = { personalInfo, education, experience, skills, projects };

  return (
    <Document>
      {template === 'modern' && <ModernTemplate {...templateProps} />}
      {template === 'professional' && <ProfessionalTemplate {...templateProps} />}
      {template === 'bold' && <BoldTemplate {...templateProps} />}
      {template === 'minimal' && <MinimalTemplate {...templateProps} />}
      {template === 'compact' && <CompactTemplate {...templateProps} />}
      {(template === 'clean' || !['modern', 'professional', 'bold', 'minimal', 'compact'].includes(template)) && (
        <CleanTemplate {...templateProps} />
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
