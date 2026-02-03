'use client';

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { getTemplateConfig, TemplateStyle, LEGACY_TEMPLATE_MAP } from '@/lib/template-config';

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
  template: string;
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
}

interface TemplateProps {
  style: TemplateStyle;
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  skills: Skill[];
  projects: Project[];
}

// ==========================================
// HELPER: GET SPACING MULTIPLIER
// ==========================================
function getSpacingMultiplier(spacing: string): number {
  switch (spacing) {
    case 'compact': return 0.7;
    case 'spacious': return 1.4;
    default: return 1;
  }
}

// ==========================================
// SINGLE COLUMN LAYOUT - 5 DISTINCT VARIANTS
// ==========================================
function SingleColumnTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const sm = getSpacingMultiplier(style.spacing);
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  // Create style-specific styles
  const styles = StyleSheet.create({
    page: {
      padding: style.spacing === 'spacious' ? 56 : style.spacing === 'compact' ? 40 : 48,
      fontSize: 10,
      fontFamily: style.bodyFont,
      color: style.textColor,
    },
    // NAME STYLES
    name: {
      fontSize: style.nameStyle === 'large' ? 28 : style.nameStyle === 'light' ? 24 : 22,
      fontFamily: style.nameStyle === 'light' ? style.bodyFont : style.headingFont,
      fontWeight: style.nameStyle === 'light' ? 300 : undefined,
      marginBottom: 8 * sm,
      letterSpacing: style.nameStyle === 'all-caps' ? 3 : style.nameStyle === 'light' ? 1 : -0.5,
      color: style.useColor ? style.primaryColor : style.textColor,
      textTransform: style.nameStyle === 'all-caps' ? 'uppercase' : undefined,
    },
    // CONTACT ROW
    contactRow: {
      flexDirection: style.contactStyle === 'stacked' ? 'column' : 'row',
      flexWrap: 'wrap',
      fontSize: 9,
      color: style.lightText,
      paddingBottom: 12 * sm,
      marginBottom: 16 * sm,
      borderBottomWidth: style.dividerStyle === 'thick-line' ? 3 : style.dividerStyle === 'thin-line' ? 1 : style.dividerStyle === 'double-line' ? 1 : 0,
      borderBottomColor: style.useColor ? style.primaryColor : '#333333',
    },
    contactItem: {
      marginRight: style.contactStyle === 'stacked' ? 0 : 12,
      marginBottom: style.contactStyle === 'stacked' ? 2 : 0,
    },
    // SECTION STYLES
    section: {
      marginBottom: 16 * sm,
    },
    sectionTitle: {
      fontSize: style.sectionStyle === 'caps-spaced' ? 10 : 9,
      fontFamily: style.headingFont,
      textTransform: 'uppercase',
      letterSpacing: style.sectionStyle === 'caps-spaced' ? 3 : 1,
      color: style.sectionStyle === 'background' ? '#ffffff' : (style.useColor ? style.primaryColor : style.textColor),
      marginBottom: 8 * sm,
      paddingBottom: style.sectionStyle === 'underline' ? 4 : style.sectionStyle === 'background' ? 6 : 2,
      paddingTop: style.sectionStyle === 'background' ? 6 : 0,
      paddingHorizontal: style.sectionStyle === 'background' ? 8 : 0,
      marginHorizontal: style.sectionStyle === 'background' ? -8 : 0,
      backgroundColor: style.sectionStyle === 'background' ? style.primaryColor : undefined,
      borderBottomWidth: style.sectionStyle === 'underline' ? 1 : style.sectionStyle === 'dots' ? 0 : 0,
      borderBottomColor: style.useColor ? style.secondaryColor : '#cccccc',
      borderBottomStyle: style.sectionStyle === 'dots' ? 'dotted' : 'solid',
    },
    dotsDecoration: {
      fontSize: 8,
      color: style.secondaryColor,
      letterSpacing: 4,
      marginBottom: 6,
    },
    summaryText: {
      fontSize: 10,
      lineHeight: 1.5,
      color: style.textColor,
    },
    entry: {
      marginBottom: 10 * sm,
    },
    entryHeader: {
      flexDirection: style.datePosition === 'below' ? 'column' : 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    entryTitle: {
      fontSize: 11,
      fontFamily: style.headingFont,
      color: style.textColor,
    },
    entryDate: {
      fontSize: 9,
      color: style.useColor ? style.primaryColor : style.lightText,
      marginTop: style.datePosition === 'below' ? 2 : 0,
      fontStyle: style.datePosition === 'below' ? 'italic' : 'normal',
    },
    entrySubtitle: {
      fontSize: 10,
      color: style.lightText,
      marginBottom: 4,
      fontStyle: style.styleId === 'elegant' ? 'italic' : 'normal',
    },
    entryDescription: {
      fontSize: 10,
      color: style.textColor,
      lineHeight: 1.5,
    },
    // SKILLS STYLES
    skillsContainer: {
      flexDirection: style.skillsStyle === 'plain' || style.skillsStyle === 'bullets' ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: style.skillsStyle === 'plain' ? 2 : 6,
    },
    skillChip: {
      backgroundColor: style.skillsStyle === 'chips' ? (style.useColor ? `${style.primaryColor}15` : '#f3f4f6') : 'transparent',
      paddingVertical: style.skillsStyle === 'chips' ? 3 : 0,
      paddingHorizontal: style.skillsStyle === 'chips' ? 10 : 0,
      borderRadius: 3,
      fontSize: 9,
      color: style.useColor ? style.primaryColor : style.textColor,
      marginRight: style.skillsStyle === 'inline' ? 8 : 6,
      marginBottom: 4,
    },
    skillInline: {
      fontSize: 10,
      color: style.textColor,
      lineHeight: 1.5,
    },
  });

  // Render skills based on style
  const renderSkills = () => {
    const validSkills = skills.filter(s => s.skill_name);
    if (validSkills.length === 0) return null;

    if (style.skillsStyle === 'inline') {
      return <Text style={styles.skillInline}>{validSkills.map(s => s.skill_name).join(' • ')}</Text>;
    }
    if (style.skillsStyle === 'plain') {
      return <Text style={styles.skillInline}>{validSkills.map(s => s.skill_name).join(', ')}</Text>;
    }
    if (style.skillsStyle === 'bullets') {
      return validSkills.map(skill => (
        <Text key={skill.id} style={styles.skillInline}>• {skill.skill_name}</Text>
      ));
    }
    // chips (default)
    return validSkills.map(skill => (
      <Text key={skill.id} style={styles.skillChip}>{skill.skill_name}</Text>
    ));
  };

  // Render section title with appropriate styling
  const renderSectionTitle = (title: string) => {
    if (style.sectionStyle === 'dots') {
      return (
        <View>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.dotsDecoration}>• • • • • • • • • • • • • •</Text>
        </View>
      );
    }
    return <Text style={styles.sectionTitle}>{title}</Text>;
  };

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.name}>{style.nameStyle === 'all-caps' ? fullName.toUpperCase() : fullName}</Text>
      <View style={styles.contactRow}>
        {contactItems.map((item, index) => (
          <Text key={index} style={styles.contactItem}>{item}{style.contactStyle !== 'stacked' && index < contactItems.length - 1 ? ' |' : ''}</Text>
        ))}
        {contactItems.length === 0 && (
          <Text style={styles.contactItem}>email@example.com | (555) 123-4567</Text>
        )}
      </View>

      {style.dividerStyle === 'double-line' && (
        <View style={{ borderBottomWidth: 1, borderBottomColor: style.useColor ? style.primaryColor : '#333333', marginTop: -14 * sm, marginBottom: 16 * sm }} />
      )}

      {personalInfo.summary && (
        <View style={styles.section}>
          {renderSectionTitle('Summary')}
          <Text style={styles.summaryText}>{personalInfo.summary}</Text>
        </View>
      )}

      {experience.length > 0 && (
        <View style={styles.section}>
          {renderSectionTitle('Experience')}
          {experience.map((exp) => (
            <View key={exp.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                {style.datePosition !== 'inline' && (
                  <Text style={styles.entryDate}>
                    {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                  </Text>
                )}
              </View>
              <Text style={styles.entrySubtitle}>
                {exp.company_name}{exp.location ? ` | ${exp.location}` : ''}
                {style.datePosition === 'inline' && ` | ${exp.start_date}${exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}`}
              </Text>
              {exp.description && <Text style={styles.entryDescription}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {education.length > 0 && (
        <View style={styles.section}>
          {renderSectionTitle('Education')}
          {education.map((edu) => (
            <View key={edu.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{edu.school_name || 'School Name'}</Text>
                {style.datePosition !== 'inline' && (
                  <Text style={styles.entryDate}>
                    {edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}
                  </Text>
                )}
              </View>
              {(edu.degree || edu.field_of_study) && (
                <Text style={styles.entrySubtitle}>
                  {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                  {edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
                </Text>
              )}
              {edu.achievements && <Text style={styles.entryDescription}>{edu.achievements}</Text>}
            </View>
          ))}
        </View>
      )}

      {skills.length > 0 && skills.some(s => s.skill_name) && (
        <View style={styles.section}>
          {renderSectionTitle('Skills')}
          <View style={styles.skillsContainer}>
            {renderSkills()}
          </View>
        </View>
      )}

      {projects.length > 0 && (
        <View style={styles.section}>
          {renderSectionTitle('Projects & Activities')}
          {projects.map((project) => (
            <View key={project.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{project.project_name || 'Project Name'}</Text>
                {project.role && <Text style={styles.entryDate}>{project.role}</Text>}
              </View>
              {project.organization && <Text style={styles.entrySubtitle}>{project.organization}</Text>}
              {project.description && <Text style={styles.entryDescription}>{project.description}</Text>}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ==========================================
// TWO COLUMN LAYOUT - 5 DISTINCT VARIANTS
// ==========================================
function TwoColumnTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const sm = getSpacingMultiplier(style.spacing);
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  // Sidebar variations
  const sidebarWidth = style.sidebarStyle === 'minimal' ? '25%' : style.sidebarStyle === 'accent-bar' ? '28%' : '32%';
  const sidebarIsDark = style.sidebarStyle === 'filled' && style.useColor;

  const styles = StyleSheet.create({
    page: {
      flexDirection: 'row',
      fontFamily: style.bodyFont,
    },
    sidebar: {
      width: sidebarWidth,
      backgroundColor: style.sidebarStyle === 'filled' ? (style.useColor ? style.sidebarBg : '#f5f5f5') :
                       style.sidebarStyle === 'bordered' ? '#ffffff' :
                       style.sidebarStyle === 'minimal' ? '#fafafa' : '#ffffff',
      padding: style.sidebarStyle === 'minimal' ? 20 : 28,
      color: sidebarIsDark ? '#ffffff' : style.textColor,
      borderRightWidth: style.sidebarStyle === 'bordered' ? 2 : style.sidebarStyle === 'accent-bar' ? 4 : 0,
      borderRightColor: style.primaryColor,
    },
    main: {
      width: style.sidebarStyle === 'minimal' ? '75%' : style.sidebarStyle === 'accent-bar' ? '72%' : '68%',
      padding: 32,
      backgroundColor: style.bgColor,
      color: style.textColor,
    },
    sidebarName: {
      fontSize: style.nameStyle === 'large' ? 20 : style.nameStyle === 'light' ? 16 : 18,
      fontFamily: style.nameStyle === 'light' ? style.bodyFont : style.headingFont,
      color: sidebarIsDark ? '#ffffff' : style.primaryColor,
      marginBottom: 2,
      letterSpacing: style.nameStyle === 'all-caps' ? 2 : 0,
      textTransform: style.nameStyle === 'all-caps' ? 'uppercase' : undefined,
    },
    sidebarSection: {
      marginTop: 20 * sm,
    },
    sidebarSectionTitle: {
      fontSize: 8,
      fontFamily: style.headingFont,
      textTransform: 'uppercase',
      letterSpacing: style.sectionStyle === 'caps-spaced' ? 3 : 1.5,
      color: sidebarIsDark ? 'rgba(255, 255, 255, 0.7)' : style.primaryColor,
      marginBottom: 10 * sm,
      paddingBottom: style.sectionStyle === 'underline' ? 4 : 2,
      borderBottomWidth: style.sectionStyle === 'underline' || style.sectionStyle === 'caps-spaced' ? 1 : 0,
      borderBottomColor: sidebarIsDark ? 'rgba(255, 255, 255, 0.3)' : style.secondaryColor,
    },
    contactItem: {
      fontSize: 9,
      color: sidebarIsDark ? 'rgba(255, 255, 255, 0.9)' : style.lightText,
      marginBottom: 4,
    },
    skillChip: {
      backgroundColor: style.skillsStyle === 'chips' ? (sidebarIsDark ? 'rgba(255, 255, 255, 0.15)' : '#e5e7eb') : 'transparent',
      paddingVertical: style.skillsStyle === 'chips' ? 3 : 0,
      paddingHorizontal: style.skillsStyle === 'chips' ? 8 : 0,
      borderRadius: 2,
      fontSize: 8,
      color: sidebarIsDark ? '#ffffff' : style.textColor,
      marginRight: 4,
      marginBottom: 4,
    },
    skillPlain: {
      fontSize: 9,
      color: sidebarIsDark ? 'rgba(255, 255, 255, 0.9)' : style.textColor,
      marginBottom: 3,
    },
    skillsContainer: {
      flexDirection: style.skillsStyle === 'plain' || style.skillsStyle === 'bullets' ? 'column' : 'row',
      flexWrap: 'wrap',
    },
    mainSection: {
      marginBottom: 18 * sm,
    },
    mainSectionTitle: {
      fontSize: 10,
      fontFamily: style.headingFont,
      textTransform: 'uppercase',
      letterSpacing: style.sectionStyle === 'caps-spaced' ? 3 : 1,
      color: style.sectionStyle === 'background' ? '#ffffff' : style.primaryColor,
      marginBottom: 10 * sm,
      paddingBottom: style.sectionStyle === 'underline' ? 4 : style.sectionStyle === 'background' ? 6 : 2,
      paddingTop: style.sectionStyle === 'background' ? 6 : 0,
      paddingHorizontal: style.sectionStyle === 'background' ? 8 : 0,
      marginHorizontal: style.sectionStyle === 'background' ? -8 : 0,
      backgroundColor: style.sectionStyle === 'background' ? style.primaryColor : undefined,
      borderBottomWidth: style.sectionStyle === 'underline' ? 2 : style.dividerStyle === 'thick-line' ? 3 : 0,
      borderBottomColor: style.primaryColor,
    },
    summaryText: {
      fontSize: 10,
      lineHeight: 1.5,
      color: style.textColor,
    },
    entry: {
      marginBottom: 10 * sm,
    },
    entryHeader: {
      flexDirection: style.datePosition === 'below' ? 'column' : 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    entryTitle: {
      fontSize: 11,
      fontFamily: style.headingFont,
      color: style.textColor,
    },
    entryDate: {
      fontSize: 9,
      color: style.useColor ? style.primaryColor : style.lightText,
      fontFamily: style.headingFont,
      fontStyle: style.datePosition === 'below' ? 'italic' : 'normal',
    },
    entrySubtitle: {
      fontSize: 10,
      color: style.lightText,
      marginBottom: 4,
      fontStyle: style.styleId === 'elegant' ? 'italic' : 'normal',
    },
    entryDescription: {
      fontSize: 10,
      color: style.textColor,
      lineHeight: 1.5,
    },
  });

  const renderSkills = () => {
    const validSkills = skills.filter(s => s.skill_name);
    if (style.skillsStyle === 'plain' || style.skillsStyle === 'inline') {
      return validSkills.map(skill => (
        <Text key={skill.id} style={styles.skillPlain}>{skill.skill_name}</Text>
      ));
    }
    if (style.skillsStyle === 'bullets') {
      return validSkills.map(skill => (
        <Text key={skill.id} style={styles.skillPlain}>• {skill.skill_name}</Text>
      ));
    }
    return validSkills.map(skill => (
      <Text key={skill.id} style={styles.skillChip}>{skill.skill_name}</Text>
    ));
  };

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.sidebar}>
        <Text style={styles.sidebarName}>{style.nameStyle === 'all-caps' ? (personalInfo.first_name || 'Your').toUpperCase() : (personalInfo.first_name || 'Your')}</Text>
        <Text style={styles.sidebarName}>{style.nameStyle === 'all-caps' ? (personalInfo.last_name || 'Name').toUpperCase() : (personalInfo.last_name || 'Name')}</Text>

        <View style={styles.sidebarSection}>
          <Text style={styles.sidebarSectionTitle}>Contact</Text>
          {contactItems.map((item, index) => (
            <Text key={index} style={styles.contactItem}>{item}</Text>
          ))}
          {contactItems.length === 0 && (
            <Text style={styles.contactItem}>email@example.com</Text>
          )}
        </View>

        {skills.length > 0 && skills.some(s => s.skill_name) && (
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {renderSkills()}
            </View>
          </View>
        )}
      </View>

      <View style={styles.main}>
        {personalInfo.summary && (
          <View style={styles.mainSection}>
            <Text style={styles.mainSectionTitle}>Summary</Text>
            <Text style={styles.summaryText}>{personalInfo.summary}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={styles.mainSection}>
            <Text style={styles.mainSectionTitle}>Experience</Text>
            {experience.map((exp) => (
              <View key={exp.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                  {style.datePosition !== 'inline' && (
                    <Text style={styles.entryDate}>
                      {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                    </Text>
                  )}
                </View>
                <Text style={styles.entrySubtitle}>
                  {exp.company_name}{exp.location ? ` | ${exp.location}` : ''}
                </Text>
                {exp.description && <Text style={styles.entryDescription}>{exp.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={styles.mainSection}>
            <Text style={styles.mainSectionTitle}>Education</Text>
            {education.map((edu) => (
              <View key={edu.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{edu.school_name || 'School Name'}</Text>
                  {style.datePosition !== 'inline' && (
                    <Text style={styles.entryDate}>
                      {edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}
                    </Text>
                  )}
                </View>
                {(edu.degree || edu.field_of_study) && (
                  <Text style={styles.entrySubtitle}>
                    {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                    {edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
                  </Text>
                )}
                {edu.achievements && <Text style={styles.entryDescription}>{edu.achievements}</Text>}
              </View>
            ))}
          </View>
        )}

        {projects.length > 0 && (
          <View style={styles.mainSection}>
            <Text style={styles.mainSectionTitle}>Projects & Activities</Text>
            {projects.map((project) => (
              <View key={project.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{project.project_name || 'Project Name'}</Text>
                  {project.role && <Text style={styles.entryDate}>{project.role}</Text>}
                </View>
                {project.organization && <Text style={styles.entrySubtitle}>{project.organization}</Text>}
                {project.description && <Text style={styles.entryDescription}>{project.description}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}

// ==========================================
// HEADER FOCUS LAYOUT - 5 DISTINCT VARIANTS
// ==========================================
function HeaderTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const sm = getSpacingMultiplier(style.spacing);
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  // Header style variations
  const headerIsDark = style.useColor;

  const styles = StyleSheet.create({
    page: {
      padding: 0,
      fontSize: 10,
      fontFamily: style.bodyFont,
      color: style.textColor,
    },
    header: {
      backgroundColor: headerIsDark ? style.headerBg : '#f8f8f8',
      padding: style.nameStyle === 'large' ? 40 : 32,
      paddingBottom: style.nameStyle === 'large' ? 32 : 24,
      borderBottomWidth: !headerIsDark ? 3 : 0,
      borderBottomColor: style.primaryColor,
    },
    name: {
      fontSize: style.nameStyle === 'large' ? 36 : style.nameStyle === 'light' ? 26 : 28,
      fontFamily: style.nameStyle === 'light' ? style.bodyFont : style.headingFont,
      color: headerIsDark ? '#ffffff' : style.primaryColor,
      marginBottom: 8,
      letterSpacing: style.nameStyle === 'all-caps' ? 4 : 1,
      textTransform: style.nameStyle === 'all-caps' ? 'uppercase' : undefined,
    },
    contactRow: {
      flexDirection: style.contactStyle === 'stacked' ? 'column' : 'row',
      flexWrap: 'wrap',
      fontSize: 9,
      color: headerIsDark ? 'rgba(255, 255, 255, 0.9)' : style.lightText,
    },
    contactItem: {
      marginRight: style.contactStyle === 'stacked' ? 0 : 16,
      marginBottom: style.contactStyle === 'stacked' ? 3 : 0,
    },
    body: {
      padding: 32,
      paddingTop: 24,
    },
    section: {
      marginBottom: 18 * sm,
    },
    sectionTitle: {
      fontSize: 11,
      fontFamily: style.headingFont,
      textTransform: 'uppercase',
      letterSpacing: style.sectionStyle === 'caps-spaced' ? 4 : 1,
      color: style.sectionStyle === 'background' ? '#ffffff' : (style.useColor ? style.primaryColor : style.textColor),
      backgroundColor: style.sectionStyle === 'background' ? style.primaryColor : undefined,
      paddingVertical: style.sectionStyle === 'background' ? 6 : 0,
      paddingHorizontal: style.sectionStyle === 'background' ? 10 : 0,
      marginBottom: 10 * sm,
      marginHorizontal: style.sectionStyle === 'background' ? -10 : 0,
      borderBottomWidth: style.sectionStyle === 'underline' ? 1 : 0,
      borderBottomColor: style.secondaryColor,
    },
    summaryText: {
      fontSize: 10,
      lineHeight: 1.5,
      color: style.textColor,
    },
    entry: {
      marginBottom: 12 * sm,
    },
    entryHeader: {
      flexDirection: style.datePosition === 'below' ? 'column' : 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    entryTitle: {
      fontSize: 11,
      fontFamily: style.headingFont,
      color: style.textColor,
    },
    entryDate: {
      fontSize: 9,
      color: style.useColor ? style.primaryColor : style.lightText,
      fontFamily: style.headingFont,
      fontStyle: style.datePosition === 'below' ? 'italic' : 'normal',
    },
    entrySubtitle: {
      fontSize: 10,
      color: style.lightText,
      marginBottom: 4,
      fontStyle: style.styleId === 'elegant' ? 'italic' : 'normal',
    },
    entryDescription: {
      fontSize: 10,
      color: style.textColor,
      lineHeight: 1.5,
    },
    skillsContainer: {
      flexDirection: style.skillsStyle === 'plain' ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    skillChip: {
      backgroundColor: style.skillsStyle === 'chips' ? (style.useColor ? style.primaryColor : '#e5e7eb') : 'transparent',
      paddingVertical: style.skillsStyle === 'chips' ? 4 : 0,
      paddingHorizontal: style.skillsStyle === 'chips' ? 10 : 0,
      borderRadius: 3,
      fontSize: 9,
      color: style.skillsStyle === 'chips' && style.useColor ? '#ffffff' : style.textColor,
      marginRight: 6,
      marginBottom: 4,
    },
    skillPlain: {
      fontSize: 10,
      color: style.textColor,
      marginBottom: 2,
    },
  });

  const renderSkills = () => {
    const validSkills = skills.filter(s => s.skill_name);
    if (style.skillsStyle === 'plain' || style.skillsStyle === 'inline') {
      return <Text style={styles.skillPlain}>{validSkills.map(s => s.skill_name).join(', ')}</Text>;
    }
    return validSkills.map(skill => (
      <Text key={skill.id} style={styles.skillChip}>{skill.skill_name}</Text>
    ));
  };

  return (
    <Page size="LETTER" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.name}>{style.nameStyle === 'all-caps' ? fullName.toUpperCase() : fullName}</Text>
        <View style={styles.contactRow}>
          {contactItems.map((item, index) => (
            <Text key={index} style={styles.contactItem}>{item}</Text>
          ))}
        </View>
      </View>

      <View style={styles.body}>
        {personalInfo.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Me</Text>
            <Text style={styles.summaryText}>{personalInfo.summary}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Work Experience</Text>
            {experience.map((exp) => (
              <View key={exp.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                  <Text style={styles.entryDate}>
                    {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                  </Text>
                </View>
                <Text style={styles.entrySubtitle}>
                  {exp.company_name}{exp.location ? ` • ${exp.location}` : ''}
                </Text>
                {exp.description && <Text style={styles.entryDescription}>{exp.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {education.map((edu) => (
              <View key={edu.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{edu.school_name || 'School Name'}</Text>
                  <Text style={styles.entryDate}>
                    {edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}
                  </Text>
                </View>
                {(edu.degree || edu.field_of_study) && (
                  <Text style={styles.entrySubtitle}>
                    {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                    {edu.gpa ? ` • GPA: ${edu.gpa}` : ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && skills.some(s => s.skill_name) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.skillsContainer}>
              {renderSkills()}
            </View>
          </View>
        )}

        {projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            {projects.map((project) => (
              <View key={project.id} style={styles.entry}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{project.project_name || 'Project Name'}</Text>
                  {project.role && <Text style={styles.entryDate}>{project.role}</Text>}
                </View>
                {project.organization && <Text style={styles.entrySubtitle}>{project.organization}</Text>}
                {project.description && <Text style={styles.entryDescription}>{project.description}</Text>}
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}

// ==========================================
// COMPACT LAYOUT - 5 DISTINCT VARIANTS
// ==========================================
function CompactTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  const styles = StyleSheet.create({
    page: {
      padding: 36,
      fontSize: 9,
      fontFamily: style.bodyFont,
      color: style.textColor,
    },
    name: {
      fontSize: style.nameStyle === 'large' ? 22 : style.nameStyle === 'light' ? 16 : 18,
      fontFamily: style.nameStyle === 'light' ? style.bodyFont : style.headingFont,
      marginBottom: 4,
      color: style.useColor ? style.primaryColor : style.textColor,
      letterSpacing: style.nameStyle === 'all-caps' ? 2 : 0,
      textTransform: style.nameStyle === 'all-caps' ? 'uppercase' : undefined,
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      fontSize: 8,
      color: style.lightText,
      marginBottom: 10,
      paddingBottom: 6,
      borderBottomWidth: style.dividerStyle === 'thick-line' ? 2 : style.dividerStyle === 'thin-line' ? 1 : 0,
      borderBottomColor: style.useColor ? style.primaryColor : '#999999',
    },
    contactItem: {
      marginRight: 10,
    },
    section: {
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 9,
      fontFamily: style.headingFont,
      textTransform: 'uppercase',
      letterSpacing: style.sectionStyle === 'caps-spaced' ? 2 : 0.5,
      color: style.sectionStyle === 'background' ? '#ffffff' : (style.useColor ? style.primaryColor : style.textColor),
      marginBottom: 4,
      backgroundColor: style.sectionStyle === 'background' ? style.primaryColor :
                       style.sectionStyle === 'minimal' ? 'transparent' : '#f5f5f5',
      paddingVertical: style.sectionStyle === 'minimal' ? 0 : 2,
      paddingHorizontal: style.sectionStyle === 'minimal' ? 0 : 4,
      borderBottomWidth: style.sectionStyle === 'underline' ? 1 : 0,
      borderBottomColor: style.secondaryColor,
    },
    summaryText: {
      fontSize: 9,
      lineHeight: 1.4,
      color: style.textColor,
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
      fontFamily: style.headingFont,
      color: style.textColor,
    },
    entryDate: {
      fontSize: 8,
      color: style.lightText,
    },
    entrySubtitle: {
      fontSize: 8,
      color: style.lightText,
      marginBottom: 2,
      fontStyle: style.styleId === 'elegant' ? 'italic' : 'normal',
    },
    entryDescription: {
      fontSize: 8,
      color: style.textColor,
      lineHeight: 1.4,
    },
    skillsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    skillChip: {
      backgroundColor: style.skillsStyle === 'chips' ? (style.useColor ? `${style.primaryColor}20` : '#f3f4f6') : 'transparent',
      paddingVertical: style.skillsStyle === 'chips' ? 2 : 0,
      paddingHorizontal: style.skillsStyle === 'chips' ? 6 : 0,
      borderRadius: 2,
      fontSize: 8,
      color: style.textColor,
      marginRight: 4,
      marginBottom: 3,
    },
    skillPlain: {
      fontSize: 8,
      color: style.textColor,
    },
  });

  const renderSkills = () => {
    const validSkills = skills.filter(s => s.skill_name);
    if (style.skillsStyle === 'plain' || style.skillsStyle === 'inline') {
      return <Text style={styles.skillPlain}>{validSkills.map(s => s.skill_name).join(', ')}</Text>;
    }
    return validSkills.map(skill => (
      <Text key={skill.id} style={styles.skillChip}>{skill.skill_name}</Text>
    ));
  };

  return (
    <Page size="LETTER" style={styles.page}>
      <Text style={styles.name}>{style.nameStyle === 'all-caps' ? fullName.toUpperCase() : fullName}</Text>
      <View style={styles.contactRow}>
        {contactItems.map((item, index) => (
          <Text key={index} style={styles.contactItem}>{item}</Text>
        ))}
      </View>

      {personalInfo.summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <Text style={styles.summaryText}>{personalInfo.summary}</Text>
        </View>
      )}

      {experience.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          {experience.map((exp) => (
            <View key={exp.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{exp.job_title} — {exp.company_name}</Text>
                <Text style={styles.entryDate}>
                  {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                </Text>
              </View>
              {exp.description && <Text style={styles.entryDescription}>{exp.description}</Text>}
            </View>
          ))}
        </View>
      )}

      {education.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {education.map((edu) => (
            <View key={edu.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>
                  {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''} — {edu.school_name}
                </Text>
                <Text style={styles.entryDate}>
                  {edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {skills.length > 0 && skills.some(s => s.skill_name) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsContainer}>
            {renderSkills()}
          </View>
        </View>
      )}

      {projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {projects.map((project) => (
            <View key={project.id} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.entryTitle}>{project.project_name}</Text>
                {project.role && <Text style={styles.entryDate}>{project.role}</Text>}
              </View>
              {project.description && <Text style={styles.entryDescription}>{project.description}</Text>}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ==========================================
// SPLIT LAYOUT - 5 DISTINCT VARIANTS
// ==========================================
function SplitTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const sm = getSpacingMultiplier(style.spacing);
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  // Accent bar variations
  const barWidth = style.dividerStyle === 'thick-line' ? 12 : style.dividerStyle === 'none' ? 0 : 8;

  const styles = StyleSheet.create({
    page: {
      flexDirection: 'row',
      fontFamily: style.bodyFont,
    },
    accentBar: {
      width: barWidth,
      backgroundColor: style.useColor ? style.primaryColor : '#333333',
    },
    main: {
      flex: 1,
      padding: 40,
      paddingLeft: barWidth > 0 ? 32 : 40,
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 4,
    },
    firstName: {
      fontSize: style.nameStyle === 'large' ? 32 : style.nameStyle === 'light' ? 26 : 28,
      fontFamily: style.nameStyle === 'light' ? style.bodyFont : style.headingFont,
      color: style.useColor ? style.primaryColor : style.textColor,
      marginRight: 8,
      letterSpacing: style.nameStyle === 'all-caps' ? 2 : 0,
      textTransform: style.nameStyle === 'all-caps' ? 'uppercase' : undefined,
    },
    lastName: {
      fontSize: style.nameStyle === 'large' ? 32 : style.nameStyle === 'light' ? 26 : 28,
      fontFamily: style.bodyFont,
      color: style.textColor,
      letterSpacing: style.nameStyle === 'all-caps' ? 2 : 0,
      textTransform: style.nameStyle === 'all-caps' ? 'uppercase' : undefined,
    },
    contactRow: {
      flexDirection: style.contactStyle === 'stacked' ? 'column' : 'row',
      flexWrap: 'wrap',
      fontSize: 9,
      color: style.lightText,
      marginBottom: 20 * sm,
      paddingBottom: 12 * sm,
      borderBottomWidth: style.dividerStyle === 'thick-line' ? 2 : style.dividerStyle === 'thin-line' ? 1 : 0,
      borderBottomColor: style.useColor ? style.secondaryColor : '#cccccc',
    },
    contactItem: {
      marginRight: style.contactStyle === 'stacked' ? 0 : 16,
      marginBottom: style.contactStyle === 'stacked' ? 2 : 0,
    },
    twoColumn: {
      flexDirection: 'row',
      gap: 24,
    },
    leftColumn: {
      width: '35%',
    },
    rightColumn: {
      width: '65%',
    },
    section: {
      marginBottom: 16 * sm,
    },
    sectionTitle: {
      fontSize: 9,
      fontFamily: style.headingFont,
      textTransform: 'uppercase',
      letterSpacing: style.sectionStyle === 'caps-spaced' ? 3 : 1.5,
      color: style.sectionStyle === 'background' ? '#ffffff' : (style.useColor ? style.primaryColor : style.textColor),
      marginBottom: 8 * sm,
      paddingBottom: style.sectionStyle === 'underline' ? 4 : style.sectionStyle === 'background' ? 4 : 2,
      paddingTop: style.sectionStyle === 'background' ? 4 : 0,
      paddingHorizontal: style.sectionStyle === 'background' ? 6 : 0,
      backgroundColor: style.sectionStyle === 'background' ? style.primaryColor : undefined,
      borderBottomWidth: style.sectionStyle === 'underline' ? 2 : 0,
      borderBottomColor: style.useColor ? style.primaryColor : '#333333',
    },
    summaryText: {
      fontSize: 10,
      lineHeight: 1.6,
      color: style.textColor,
    },
    entry: {
      marginBottom: 10 * sm,
    },
    entryHeader: {
      marginBottom: 2,
    },
    entryTitle: {
      fontSize: 11,
      fontFamily: style.headingFont,
      color: style.textColor,
    },
    entryDate: {
      fontSize: 8,
      color: style.useColor ? style.primaryColor : style.lightText,
      marginTop: 1,
      fontStyle: style.datePosition === 'below' ? 'italic' : 'normal',
    },
    entrySubtitle: {
      fontSize: 9,
      color: style.lightText,
      marginBottom: 4,
      fontStyle: style.styleId === 'elegant' ? 'italic' : 'normal',
    },
    entryDescription: {
      fontSize: 9,
      color: style.textColor,
      lineHeight: 1.5,
    },
    skillsContainer: {
      flexDirection: style.skillsStyle === 'plain' ? 'column' : 'row',
      flexWrap: 'wrap',
    },
    skillItem: {
      fontSize: 9,
      color: style.textColor,
      marginBottom: 4,
      paddingLeft: style.skillsStyle === 'bullets' || style.skillsStyle === 'bars' ? 8 : 0,
      borderLeftWidth: style.skillsStyle === 'bars' ? 2 : 0,
      borderLeftColor: style.useColor ? style.primaryColor : '#333333',
    },
    skillPlain: {
      fontSize: 9,
      color: style.textColor,
      marginBottom: 2,
    },
  });

  const renderSkills = () => {
    const validSkills = skills.filter(s => s.skill_name);
    if (style.skillsStyle === 'plain') {
      return validSkills.map(skill => (
        <Text key={skill.id} style={styles.skillPlain}>{skill.skill_name}</Text>
      ));
    }
    if (style.skillsStyle === 'bullets') {
      return validSkills.map(skill => (
        <Text key={skill.id} style={styles.skillItem}>• {skill.skill_name}</Text>
      ));
    }
    if (style.skillsStyle === 'inline') {
      return <Text style={styles.skillPlain}>{validSkills.map(s => s.skill_name).join(' • ')}</Text>;
    }
    // bars (default for split)
    return validSkills.map(skill => (
      <Text key={skill.id} style={styles.skillItem}>{skill.skill_name}</Text>
    ));
  };

  return (
    <Page size="LETTER" style={styles.page}>
      {barWidth > 0 && <View style={styles.accentBar} />}
      <View style={styles.main}>
        <View style={styles.nameRow}>
          <Text style={styles.firstName}>{style.nameStyle === 'all-caps' ? (personalInfo.first_name || 'Your').toUpperCase() : (personalInfo.first_name || 'Your')}</Text>
          <Text style={styles.lastName}>{style.nameStyle === 'all-caps' ? (personalInfo.last_name || 'Name').toUpperCase() : (personalInfo.last_name || 'Name')}</Text>
        </View>
        <View style={styles.contactRow}>
          {contactItems.map((item, index) => (
            <Text key={index} style={styles.contactItem}>{item}</Text>
          ))}
        </View>

        {personalInfo.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Text style={styles.summaryText}>{personalInfo.summary}</Text>
          </View>
        )}

        <View style={styles.twoColumn}>
          <View style={styles.leftColumn}>
            {skills.length > 0 && skills.some(s => s.skill_name) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.skillsContainer}>
                  {renderSkills()}
                </View>
              </View>
            )}

            {education.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Education</Text>
                {education.map((edu) => (
                  <View key={edu.id} style={styles.entry}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTitle}>{edu.school_name || 'School'}</Text>
                      <Text style={styles.entryDate}>
                        {edu.end_date ? (edu.is_current ? 'Present' : edu.end_date) : ''}
                      </Text>
                    </View>
                    {(edu.degree || edu.field_of_study) && (
                      <Text style={styles.entrySubtitle}>
                        {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.rightColumn}>
            {experience.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Experience</Text>
                {experience.map((exp) => (
                  <View key={exp.id} style={styles.entry}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTitle}>{exp.job_title || 'Job Title'}</Text>
                      <Text style={styles.entryDate}>
                        {exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}
                      </Text>
                    </View>
                    <Text style={styles.entrySubtitle}>{exp.company_name}</Text>
                    {exp.description && <Text style={styles.entryDescription}>{exp.description}</Text>}
                  </View>
                ))}
              </View>
            )}

            {projects.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Projects</Text>
                {projects.map((project) => (
                  <View key={project.id} style={styles.entry}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTitle}>{project.project_name || 'Project'}</Text>
                    </View>
                    {project.description && <Text style={styles.entryDescription}>{project.description}</Text>}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    </Page>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ResumePDF({ template, personalInfo, education, experience, skills, projects }: ResumePDFProps) {
  // Get template configuration (handles legacy names)
  const config = getTemplateConfig(template);
  const templateProps = {
    style: config.styleConfig,
    personalInfo,
    education,
    experience,
    skills,
    projects,
  };

  // Render appropriate layout based on config
  const renderLayout = () => {
    switch (config.layout) {
      case 'twocolumn':
        return <TwoColumnTemplate {...templateProps} />;
      case 'header':
        return <HeaderTemplate {...templateProps} />;
      case 'compact':
        return <CompactTemplate {...templateProps} />;
      case 'split':
        return <SplitTemplate {...templateProps} />;
      case 'single':
      default:
        return <SingleColumnTemplate {...templateProps} />;
    }
  };

  return <Document>{renderLayout()}</Document>;
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
