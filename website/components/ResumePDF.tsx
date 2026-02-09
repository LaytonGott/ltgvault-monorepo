'use client';

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import { getTemplateConfig, TemplateStyle, COLOR_THEMES, ColorThemeId } from '@/lib/template-config';

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
  colorTheme?: string;
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
// SINGLE COLUMN LAYOUT
// Each style creates visually distinct appearance
// ==========================================
function SingleColumnTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const displayName = style.nameUppercase ? fullName.toUpperCase() : fullName;
  const contactItems = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.location,
    personalInfo.linkedin_url,
    personalInfo.website_url,
  ].filter(Boolean);

  const s = StyleSheet.create({
    page: {
      padding: style.pageMargin,
      fontSize: 10,
      fontFamily: style.bodyFont,
      color: style.textColor,
      lineHeight: style.lineHeight,
    },
    name: {
      fontSize: style.nameSize,
      fontFamily: style.headingFont,
      letterSpacing: style.nameLetterSpacing,
      color: style.primaryColor,
      marginBottom: style.nameUnderline ? 4 : 8,
      textAlign: style.styleId === 'elegant' ? 'center' : 'left',
    },
    nameUnderline: {
      height: style.nameUnderlineThickness,
      backgroundColor: style.primaryColor,
      marginBottom: 8,
      width: style.styleId === 'bold' ? '40%' : '100%',
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: style.styleId === 'elegant' ? 'center' : 'flex-start',
      fontSize: 9,
      color: style.lightText,
      marginBottom: style.headerDivider ? 8 : style.sectionGap,
    },
    contactItem: {
      marginRight: 16,
      marginBottom: 2,
    },
    headerDivider: {
      height: style.headerDividerThickness,
      backgroundColor: style.primaryColor,
      marginBottom: style.sectionGap,
    },
    section: {
      marginBottom: style.sectionGap,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      backgroundColor: style.sectionBackground ? style.primaryColor : 'transparent',
      paddingVertical: style.sectionBackground ? 4 : 0,
      paddingHorizontal: style.sectionBackground ? 8 : 0,
      marginHorizontal: style.sectionBackground ? -8 : 0,
    },
    sectionTitle: {
      fontSize: style.sectionSize,
      fontFamily: style.headingFont,
      textTransform: style.sectionUppercase ? 'uppercase' : 'none',
      letterSpacing: style.sectionLetterSpacing,
      color: style.sectionBackground ? '#ffffff' : style.primaryColor,
    },
    sectionUnderline: {
      height: style.sectionUnderlineThickness,
      backgroundColor: style.primaryColor,
      marginTop: 4,
      marginBottom: 8,
    },
    sectionDots: {
      fontSize: 8,
      color: style.secondaryColor,
      letterSpacing: 4,
      marginTop: 4,
      marginBottom: 8,
    },
    entry: {
      marginBottom: style.entryGap,
      paddingBottom: style.entryDividers ? style.entryGap : 0,
      borderBottomWidth: style.entryDividers ? 1 : 0,
      borderBottomColor: '#e5e5e5',
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
      color: style.styleId === 'minimal' ? style.lightText : style.primaryColor,
      fontStyle: style.dateItalic ? 'italic' : 'normal',
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
    },
    skillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    skillChip: {
      backgroundColor: style.skillsStyle === 'chips' ? `${style.primaryColor}15` : 'transparent',
      paddingVertical: style.skillsStyle === 'chips' ? 3 : 0,
      paddingHorizontal: style.skillsStyle === 'chips' ? 10 : 0,
      borderRadius: 3,
      fontSize: 9,
      color: style.skillsStyle === 'chips' ? style.primaryColor : style.textColor,
    },
    skillsInline: {
      fontSize: 10,
      color: style.textColor,
    },
  });

  const renderSectionTitle = (title: string) => (
    <View>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>{style.sectionUppercase ? title.toUpperCase() : title}</Text>
      </View>
      {style.sectionUnderline && <View style={s.sectionUnderline} />}
      {style.sectionDots && <Text style={s.sectionDots}>• • • • • • • • • •</Text>}
    </View>
  );

  const renderSkills = () => {
    const validSkills = skills.filter(s => s.skill_name);
    if (style.skillsStyle === 'commas' || style.skillsStyle === 'inline') {
      return <Text style={s.skillsInline}>{validSkills.map(s => s.skill_name).join(style.skillsStyle === 'commas' ? ', ' : ' • ')}</Text>;
    }
    if (style.skillsStyle === 'bullets') {
      return validSkills.map(skill => (
        <Text key={skill.id} style={s.skillsInline}>• {skill.skill_name}</Text>
      ));
    }
    return (
      <View style={s.skillsRow}>
        {validSkills.map(skill => (
          <Text key={skill.id} style={s.skillChip}>{skill.skill_name}</Text>
        ))}
      </View>
    );
  };

  const formatDate = (exp: Experience | Education) => {
    const start = 'start_date' in exp ? exp.start_date : '';
    const end = exp.is_current ? 'Present' : ('end_date' in exp ? exp.end_date : '');
    if (style.datePosition === 'inline') {
      return start && end ? `(${start} - ${end})` : '';
    }
    return start && end ? `${start} - ${end}` : (start || end || '');
  };

  return (
    <Page size="LETTER" style={s.page}>
      <Text style={s.name}>{displayName}</Text>
      {style.nameUnderline && <View style={s.nameUnderline} />}

      <View style={s.contactRow}>
        {contactItems.map((item, i) => (
          <Text key={i} style={s.contactItem}>{item}{i < contactItems.length - 1 ? ' |' : ''}</Text>
        ))}
      </View>

      {style.headerDivider && <View style={s.headerDivider} />}

      {personalInfo.summary && (
        <View style={s.section}>
          {renderSectionTitle('Summary')}
          <Text style={s.entryDescription}>{personalInfo.summary}</Text>
        </View>
      )}

      {experience.length > 0 && (
        <View style={s.section}>
          {renderSectionTitle('Experience')}
          {experience.map((exp) => (
            <View key={exp.id} style={s.entry}>
              <View style={s.entryHeader}>
                <Text style={s.entryTitle}>
                  {exp.job_title || 'Job Title'}
                  {style.datePosition === 'inline' ? ` ${formatDate(exp)}` : ''}
                </Text>
                {style.datePosition === 'right' && <Text style={s.entryDate}>{formatDate(exp)}</Text>}
              </View>
              {style.datePosition === 'below' && <Text style={s.entryDate}>{formatDate(exp)}</Text>}
              <Text style={s.entrySubtitle}>{exp.company_name}{exp.location ? ` | ${exp.location}` : ''}</Text>
              {exp.description && (
                <View style={{ marginTop: 2 }}>
                  {exp.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 1 }}>
                      <Text style={s.entryDescription}>{'•  '}</Text>
                      <Text style={[s.entryDescription, { flex: 1 }]}>{line.replace(/^[-•]\s*/, '')}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {education.length > 0 && (
        <View style={s.section}>
          {renderSectionTitle('Education')}
          {education.map((edu) => (
            <View key={edu.id} style={s.entry}>
              <View style={s.entryHeader}>
                <Text style={s.entryTitle}>{edu.school_name || 'School Name'}</Text>
                {style.datePosition === 'right' && <Text style={s.entryDate}>{formatDate(edu)}</Text>}
              </View>
              {style.datePosition === 'below' && <Text style={s.entryDate}>{formatDate(edu)}</Text>}
              {(edu.degree || edu.field_of_study) && (
                <Text style={s.entrySubtitle}>
                  {edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}
                  {edu.gpa ? ` | GPA: ${edu.gpa}` : ''}
                </Text>
              )}
              {edu.achievements && <Text style={s.entryDescription}>{edu.achievements}</Text>}
            </View>
          ))}
        </View>
      )}

      {skills.length > 0 && skills.some(sk => sk.skill_name) && (
        <View style={s.section}>
          {renderSectionTitle('Skills')}
          {renderSkills()}
        </View>
      )}

      {projects.length > 0 && (
        <View style={s.section}>
          {renderSectionTitle('Projects & Activities')}
          {projects.map((proj) => (
            <View key={proj.id} style={s.entry}>
              <View style={s.entryHeader}>
                <Text style={s.entryTitle}>{proj.project_name || 'Project'}</Text>
                {proj.role && <Text style={s.entryDate}>{proj.role}</Text>}
              </View>
              {proj.organization && <Text style={s.entrySubtitle}>{proj.organization}</Text>}
              {proj.description && (
                <View style={{ marginTop: 2 }}>
                  {proj.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: 1 }}>
                      <Text style={s.entryDescription}>{'•  '}</Text>
                      <Text style={[s.entryDescription, { flex: 1 }]}>{line.replace(/^[-•]\s*/, '')}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </Page>
  );
}

// ==========================================
// TWO COLUMN LAYOUT
// Different sidebar treatments for each style
// ==========================================
function TwoColumnTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const firstName = personalInfo.first_name || 'Your';
  const lastName = personalInfo.last_name || 'Name';
  const contactItems = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin_url, personalInfo.website_url].filter(Boolean);
  const hasPhoto = !!personalInfo.photo_url;

  // Sidebar style depends on variant
  const sidebarIsFilled = style.sidebarFilled && !style.sidebarBorderOnly;
  const sidebarIsDark = sidebarIsFilled && style.styleId !== 'classic';
  const sidebarBgColor = sidebarIsFilled ? style.sidebarBg : (style.sidebarBorderOnly ? '#ffffff' : '#fafafa');
  const sidebarTextColor = sidebarIsDark ? '#ffffff' : style.textColor;
  const sidebarLightColor = sidebarIsDark ? 'rgba(255,255,255,0.8)' : style.lightText;

  const s = StyleSheet.create({
    page: {
      flexDirection: 'row',
      fontSize: 10,
      fontFamily: style.bodyFont,
      color: style.textColor,
    },
    sidebar: {
      width: `${style.sidebarWidth}%`,
      backgroundColor: sidebarBgColor,
      padding: style.pageMargin * 0.6,
      paddingTop: style.pageMargin,
      borderRightWidth: style.sidebarBorderOnly ? 2 : 0,
      borderRightColor: style.primaryColor,
    },
    sidebarName: {
      fontSize: style.nameSize * 0.85,
      fontFamily: style.headingFont,
      color: sidebarIsDark ? '#ffffff' : style.primaryColor,
      letterSpacing: style.nameLetterSpacing,
      marginBottom: 2,
    },
    sidebarSection: {
      marginTop: style.sectionGap,
    },
    sidebarSectionTitle: {
      fontSize: 9,
      fontFamily: style.headingFont,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: sidebarIsDark ? 'rgba(255,255,255,0.7)' : style.primaryColor,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: style.sectionUnderline ? 1 : 0,
      borderBottomColor: sidebarIsDark ? 'rgba(255,255,255,0.3)' : style.primaryColor,
    },
    contactItem: {
      fontSize: 9,
      color: sidebarLightColor,
      marginBottom: 4,
    },
    skillChip: {
      backgroundColor: style.skillsStyle === 'chips' ? (sidebarIsDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb') : 'transparent',
      paddingVertical: style.skillsStyle === 'chips' ? 3 : 0,
      paddingHorizontal: style.skillsStyle === 'chips' ? 8 : 0,
      borderRadius: 2,
      fontSize: 8,
      color: sidebarTextColor,
      marginRight: 4,
      marginBottom: 4,
    },
    skillText: {
      fontSize: 9,
      color: sidebarLightColor,
      marginBottom: 2,
    },
    photo: {
      width: 80,
      height: 80,
      borderRadius: 40,
      marginBottom: 12,
      alignSelf: 'center',
      border: sidebarIsDark ? '2px solid rgba(255,255,255,0.3)' : `2px solid ${style.primaryColor}`,
    },
    main: {
      width: `${100 - style.sidebarWidth}%`,
      padding: style.pageMargin * 0.8,
      paddingTop: style.pageMargin,
    },
    mainSection: {
      marginBottom: style.sectionGap,
    },
    mainSectionTitle: {
      fontSize: style.sectionSize,
      fontFamily: style.headingFont,
      textTransform: style.sectionUppercase ? 'uppercase' : 'none',
      letterSpacing: style.sectionLetterSpacing,
      color: style.sectionBackground ? '#ffffff' : style.primaryColor,
      marginBottom: 10,
      paddingVertical: style.sectionBackground ? 4 : 0,
      paddingHorizontal: style.sectionBackground ? 8 : 0,
      marginHorizontal: style.sectionBackground ? -8 : 0,
      backgroundColor: style.sectionBackground ? style.primaryColor : 'transparent',
      borderBottomWidth: style.sectionUnderline ? 2 : 0,
      borderBottomColor: style.primaryColor,
    },
    entry: {
      marginBottom: style.entryGap,
    },
    entryHeader: {
      flexDirection: style.datePosition === 'below' ? 'column' : 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    entryTitle: {
      fontSize: 11,
      fontFamily: style.headingFont,
    },
    entryDate: {
      fontSize: 9,
      color: style.primaryColor,
      fontStyle: style.dateItalic ? 'italic' : 'normal',
    },
    entrySubtitle: {
      fontSize: 10,
      color: style.lightText,
      marginBottom: 4,
    },
    entryDescription: {
      fontSize: 10,
      lineHeight: style.lineHeight,
    },
  });

  const renderSkills = () => {
    const validSkills = skills.filter(sk => sk.skill_name);
    if (style.skillsStyle === 'chips') {
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {validSkills.map(skill => <Text key={skill.id} style={s.skillChip}>{skill.skill_name}</Text>)}
        </View>
      );
    }
    return validSkills.map(skill => <Text key={skill.id} style={s.skillText}>{skill.skill_name}</Text>);
  };

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.sidebar}>
        {hasPhoto && personalInfo.photo_url && (
          <Image src={personalInfo.photo_url} style={s.photo} />
        )}
        <Text style={s.sidebarName}>{style.nameUppercase ? firstName.toUpperCase() : firstName}</Text>
        <Text style={s.sidebarName}>{style.nameUppercase ? lastName.toUpperCase() : lastName}</Text>

        <View style={s.sidebarSection}>
          <Text style={s.sidebarSectionTitle}>Contact</Text>
          {contactItems.map((item, i) => <Text key={i} style={s.contactItem}>{item}</Text>)}
        </View>

        {skills.length > 0 && skills.some(sk => sk.skill_name) && (
          <View style={s.sidebarSection}>
            <Text style={s.sidebarSectionTitle}>Skills</Text>
            {renderSkills()}
          </View>
        )}
      </View>

      <View style={s.main}>
        {personalInfo.summary && (
          <View style={s.mainSection}>
            <Text style={s.mainSectionTitle}>Summary</Text>
            <Text style={s.entryDescription}>{personalInfo.summary}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={s.mainSection}>
            <Text style={s.mainSectionTitle}>Experience</Text>
            {experience.map(exp => (
              <View key={exp.id} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{exp.job_title}</Text>
                  <Text style={s.entryDate}>{exp.start_date}{exp.end_date ? ` - ${exp.is_current ? 'Present' : exp.end_date}` : ''}</Text>
                </View>
                <Text style={s.entrySubtitle}>{exp.company_name}{exp.location ? ` | ${exp.location}` : ''}</Text>
                {exp.description && (
                  <View style={{ marginTop: 2 }}>
                    {exp.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', marginBottom: 1 }}>
                        <Text style={s.entryDescription}>{'•  '}</Text>
                        <Text style={[s.entryDescription, { flex: 1 }]}>{line.replace(/^[-•]\s*/, '')}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={s.mainSection}>
            <Text style={s.mainSectionTitle}>Education</Text>
            {education.map(edu => (
              <View key={edu.id} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{edu.school_name}</Text>
                  <Text style={s.entryDate}>{edu.start_date}{edu.end_date ? ` - ${edu.is_current ? 'Present' : edu.end_date}` : ''}</Text>
                </View>
                {(edu.degree || edu.field_of_study) && (
                  <Text style={s.entrySubtitle}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}{edu.gpa ? ` | GPA: ${edu.gpa}` : ''}</Text>
                )}
                {edu.achievements && <Text style={s.entryDescription}>{edu.achievements}</Text>}
              </View>
            ))}
          </View>
        )}

        {projects.length > 0 && (
          <View style={s.mainSection}>
            <Text style={s.mainSectionTitle}>Projects</Text>
            {projects.map(proj => (
              <View key={proj.id} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{proj.project_name}</Text>
                  {proj.role && <Text style={s.entryDate}>{proj.role}</Text>}
                </View>
                {proj.organization && <Text style={s.entrySubtitle}>{proj.organization}</Text>}
                {proj.description && (
                  <View style={{ marginTop: 2 }}>
                    {proj.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', marginBottom: 1 }}>
                        <Text style={s.entryDescription}>{'•  '}</Text>
                        <Text style={[s.entryDescription, { flex: 1 }]}>{line.replace(/^[-•]\s*/, '')}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}

// ==========================================
// HEADER FOCUS LAYOUT
// Bold header section with different styles
// ==========================================
function HeaderTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const displayName = style.nameUppercase ? fullName.toUpperCase() : fullName;
  const contactItems = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin_url, personalInfo.website_url].filter(Boolean);
  const hasPhoto = !!personalInfo.photo_url;

  // Header style varies by variant
  const headerIsFilled = style.styleId === 'modern' || style.styleId === 'bold';
  const headerBg = headerIsFilled ? style.headerBg : '#ffffff';
  const headerTextColor = headerIsFilled ? '#ffffff' : style.textColor;

  const s = StyleSheet.create({
    page: {
      fontSize: 10,
      fontFamily: style.bodyFont,
      color: style.textColor,
    },
    header: {
      backgroundColor: headerBg,
      padding: style.pageMargin,
      paddingBottom: style.pageMargin * 0.6,
      marginBottom: style.sectionGap,
    },
    headerName: {
      fontSize: style.nameSize,
      fontFamily: style.headingFont,
      color: headerTextColor,
      letterSpacing: style.nameLetterSpacing,
      marginBottom: 8,
      textAlign: style.styleId === 'classic' ? 'center' : 'left',
    },
    headerContact: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: style.styleId === 'classic' ? 'center' : 'flex-start',
      gap: 16,
    },
    headerContactItem: {
      fontSize: 9,
      color: headerIsFilled ? 'rgba(255,255,255,0.9)' : style.lightText,
    },
    body: {
      padding: style.pageMargin,
      paddingTop: 0,
    },
    section: {
      marginBottom: style.sectionGap,
    },
    sectionTitle: {
      fontSize: style.sectionSize,
      fontFamily: style.headingFont,
      textTransform: style.sectionUppercase ? 'uppercase' : 'none',
      letterSpacing: style.sectionLetterSpacing,
      color: style.sectionBackground ? '#ffffff' : style.primaryColor,
      marginBottom: 10,
      paddingVertical: style.sectionBackground ? 4 : 0,
      paddingHorizontal: style.sectionBackground ? 8 : 0,
      backgroundColor: style.sectionBackground ? style.primaryColor : 'transparent',
      borderBottomWidth: style.sectionUnderline ? 2 : 0,
      borderBottomColor: style.primaryColor,
    },
    entry: {
      marginBottom: style.entryGap,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    entryTitle: {
      fontSize: 11,
      fontFamily: style.headingFont,
    },
    entryDate: {
      fontSize: 9,
      color: style.primaryColor,
    },
    entrySubtitle: {
      fontSize: 10,
      color: style.lightText,
      marginBottom: 4,
    },
    entryDescription: {
      fontSize: 10,
      lineHeight: style.lineHeight,
    },
    skillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    skillChip: {
      backgroundColor: `${style.primaryColor}15`,
      paddingVertical: 3,
      paddingHorizontal: 10,
      borderRadius: 3,
      fontSize: 9,
      color: style.primaryColor,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
    },
    photo: {
      width: 70,
      height: 70,
      borderRadius: 35,
      border: headerIsFilled ? '2px solid rgba(255,255,255,0.5)' : `2px solid ${style.primaryColor}`,
    },
    headerContent: {
      flex: 1,
    },
  });

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.header}>
        {hasPhoto ? (
          <View style={s.headerRow}>
            {personalInfo.photo_url && <Image src={personalInfo.photo_url} style={s.photo} />}
            <View style={s.headerContent}>
              <Text style={s.headerName}>{displayName}</Text>
              <View style={s.headerContact}>
                {contactItems.map((item, i) => <Text key={i} style={s.headerContactItem}>{item}</Text>)}
              </View>
            </View>
          </View>
        ) : (
          <>
            <Text style={s.headerName}>{displayName}</Text>
            <View style={s.headerContact}>
              {contactItems.map((item, i) => <Text key={i} style={s.headerContactItem}>{item}</Text>)}
            </View>
          </>
        )}
      </View>

      <View style={s.body}>
        {personalInfo.summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>About</Text>
            <Text style={s.entryDescription}>{personalInfo.summary}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Experience</Text>
            {experience.map(exp => (
              <View key={exp.id} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{exp.job_title}</Text>
                  <Text style={s.entryDate}>{exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}</Text>
                </View>
                <Text style={s.entrySubtitle}>{exp.company_name}</Text>
                {exp.description && (
                  <View style={{ marginTop: 2 }}>
                    {exp.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', marginBottom: 1 }}>
                        <Text style={s.entryDescription}>{'•  '}</Text>
                        <Text style={[s.entryDescription, { flex: 1 }]}>{line.replace(/^[-•]\s*/, '')}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Education</Text>
            {education.map(edu => (
              <View key={edu.id} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{edu.school_name}</Text>
                  <Text style={s.entryDate}>{edu.end_date || ''}</Text>
                </View>
                {edu.degree && <Text style={s.entrySubtitle}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</Text>}
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && skills.some(sk => sk.skill_name) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Skills</Text>
            <View style={s.skillsRow}>
              {skills.filter(sk => sk.skill_name).map(skill => (
                <Text key={skill.id} style={s.skillChip}>{skill.skill_name}</Text>
              ))}
            </View>
          </View>
        )}
      </View>
    </Page>
  );
}

// ==========================================
// COMPACT LAYOUT
// Dense design to fit more content
// ==========================================
function CompactTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin_url, personalInfo.website_url].filter(Boolean);

  const s = StyleSheet.create({
    page: {
      padding: style.pageMargin * 0.8,
      fontSize: 9,
      fontFamily: style.bodyFont,
      color: style.textColor,
      lineHeight: 1.3,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: style.headerDivider ? style.headerDividerThickness : 0,
      borderBottomColor: style.primaryColor,
    },
    name: {
      fontSize: style.nameSize * 0.85,
      fontFamily: style.headingFont,
      color: style.primaryColor,
    },
    contactColumn: {
      alignItems: 'flex-end',
    },
    contactItem: {
      fontSize: 8,
      color: style.lightText,
      marginBottom: 1,
    },
    twoColumn: {
      flexDirection: 'row',
      gap: 20,
    },
    leftColumn: {
      width: '60%',
    },
    rightColumn: {
      width: '40%',
    },
    section: {
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 9,
      fontFamily: style.headingFont,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: style.primaryColor,
      marginBottom: 6,
      paddingBottom: style.sectionUnderline ? 2 : 0,
      borderBottomWidth: style.sectionUnderline ? 1 : 0,
      borderBottomColor: style.primaryColor,
    },
    entry: {
      marginBottom: 6,
    },
    entryTitle: {
      fontSize: 10,
      fontFamily: style.headingFont,
    },
    entryMeta: {
      fontSize: 8,
      color: style.lightText,
      marginBottom: 2,
    },
    entryDescription: {
      fontSize: 9,
    },
    skillsText: {
      fontSize: 9,
    },
  });

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.header}>
        <Text style={s.name}>{fullName}</Text>
        <View style={s.contactColumn}>
          {contactItems.map((item, i) => <Text key={i} style={s.contactItem}>{item}</Text>)}
        </View>
      </View>

      {personalInfo.summary && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Summary</Text>
          <Text style={s.entryDescription}>{personalInfo.summary}</Text>
        </View>
      )}

      <View style={s.twoColumn}>
        <View style={s.leftColumn}>
          {experience.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Experience</Text>
              {experience.map(exp => (
                <View key={exp.id} style={s.entry}>
                  <Text style={s.entryTitle}>{exp.job_title} -{exp.company_name}</Text>
                  <Text style={s.entryMeta}>{exp.start_date} - {exp.is_current ? 'Present' : exp.end_date}</Text>
                  {exp.description && (
                    <View style={{ marginTop: 2 }}>
                      {exp.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 1 }}>
                          <Text style={s.entryDescription}>{'•  '}</Text>
                          <Text style={[s.entryDescription, { flex: 1 }]}>{line.replace(/^[-•]\s*/, '')}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {projects.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Projects</Text>
              {projects.map(proj => (
                <View key={proj.id} style={s.entry}>
                  <Text style={s.entryTitle}>{proj.project_name}</Text>
                  {proj.description && (
                    <View style={{ marginTop: 2 }}>
                      {proj.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                        <View key={i} style={{ flexDirection: 'row', marginBottom: 1 }}>
                          <Text style={s.entryDescription}>{'•  '}</Text>
                          <Text style={[s.entryDescription, { flex: 1 }]}>{line.replace(/^[-•]\s*/, '')}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={s.rightColumn}>
          {education.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Education</Text>
              {education.map(edu => (
                <View key={edu.id} style={s.entry}>
                  <Text style={s.entryTitle}>{edu.school_name}</Text>
                  <Text style={s.entryMeta}>{edu.degree}{edu.field_of_study ? `, ${edu.field_of_study}` : ''}</Text>
                  {edu.gpa && <Text style={s.entryMeta}>GPA: {edu.gpa}</Text>}
                </View>
              ))}
            </View>
          )}

          {skills.length > 0 && skills.some(sk => sk.skill_name) && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Skills</Text>
              <Text style={s.skillsText}>{skills.filter(sk => sk.skill_name).map(sk => sk.skill_name).join(', ')}</Text>
            </View>
          )}
        </View>
      </View>
    </Page>
  );
}

// ==========================================
// SPLIT/MODERN LAYOUT
// Creative asymmetric design
// ==========================================
function SplitTemplate({ style, personalInfo, education, experience, skills, projects }: TemplateProps) {
  const fullName = [personalInfo.first_name, personalInfo.last_name].filter(Boolean).join(' ') || 'Your Name';
  const contactItems = [personalInfo.email, personalInfo.phone, personalInfo.location, personalInfo.linkedin_url, personalInfo.website_url].filter(Boolean);

  const s = StyleSheet.create({
    page: {
      flexDirection: 'row',
      fontSize: 10,
      fontFamily: style.bodyFont,
      color: style.textColor,
    },
    accentBar: {
      width: 8,
      backgroundColor: style.primaryColor,
    },
    main: {
      flex: 1,
      padding: style.pageMargin,
    },
    header: {
      marginBottom: style.sectionGap,
    },
    name: {
      fontSize: style.nameSize,
      fontFamily: style.headingFont,
      color: style.primaryColor,
      letterSpacing: style.nameLetterSpacing,
      marginBottom: 6,
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    contactItem: {
      fontSize: 9,
      color: style.lightText,
    },
    section: {
      marginBottom: style.sectionGap,
    },
    sectionTitle: {
      fontSize: style.sectionSize,
      fontFamily: style.headingFont,
      textTransform: style.sectionUppercase ? 'uppercase' : 'none',
      letterSpacing: style.sectionLetterSpacing,
      color: style.primaryColor,
      marginBottom: 10,
      borderLeftWidth: 3,
      borderLeftColor: style.primaryColor,
      paddingLeft: 8,
    },
    entry: {
      marginBottom: style.entryGap,
    },
    entryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    entryTitle: {
      fontSize: 11,
      fontFamily: style.headingFont,
    },
    entryDate: {
      fontSize: 9,
      color: style.lightText,
    },
    entrySubtitle: {
      fontSize: 10,
      color: style.lightText,
      marginBottom: 4,
    },
    entryDescription: {
      fontSize: 10,
      lineHeight: style.lineHeight,
    },
    skillsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    skill: {
      fontSize: 9,
      color: style.textColor,
      paddingRight: 8,
    },
  });

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.accentBar} />
      <View style={s.main}>
        <View style={s.header}>
          <Text style={s.name}>{fullName}</Text>
          <View style={s.contactRow}>
            {contactItems.map((item, i) => <Text key={i} style={s.contactItem}>{item}</Text>)}
          </View>
        </View>

        {personalInfo.summary && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Profile</Text>
            <Text style={s.entryDescription}>{personalInfo.summary}</Text>
          </View>
        )}

        {experience.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Experience</Text>
            {experience.map(exp => (
              <View key={exp.id} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{exp.job_title}</Text>
                  <Text style={s.entryDate}>{exp.start_date} -{exp.is_current ? 'Present' : exp.end_date}</Text>
                </View>
                <Text style={s.entrySubtitle}>{exp.company_name}</Text>
                {exp.description && (
                  <View style={{ marginTop: 2 }}>
                    {exp.description.split('\n').filter(Boolean).map((line: string, i: number) => (
                      <View key={i} style={{ flexDirection: 'row', marginBottom: 1 }}>
                        <Text style={s.entryDescription}>{'•  '}</Text>
                        <Text style={[s.entryDescription, { flex: 1 }]}>{line.replace(/^[-•]\s*/, '')}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {education.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Education</Text>
            {education.map(edu => (
              <View key={edu.id} style={s.entry}>
                <View style={s.entryHeader}>
                  <Text style={s.entryTitle}>{edu.school_name}</Text>
                  <Text style={s.entryDate}>{edu.end_date || ''}</Text>
                </View>
                {edu.degree && <Text style={s.entrySubtitle}>{edu.degree}{edu.field_of_study ? ` in ${edu.field_of_study}` : ''}</Text>}
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && skills.some(sk => sk.skill_name) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Skills</Text>
            <View style={s.skillsRow}>
              {skills.filter(sk => sk.skill_name).map(skill => (
                <Text key={skill.id} style={s.skill}>• {skill.skill_name}</Text>
              ))}
            </View>
          </View>
        )}
      </View>
    </Page>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ResumePDF({ template, colorTheme, personalInfo, education, experience, skills, projects }: ResumePDFProps) {
  const config = getTemplateConfig(template);

  // Apply color theme (default is Black #000000)
  let effectiveStyle = { ...config.styleConfig };
  const themeId = colorTheme || 'default';
  const theme = COLOR_THEMES[themeId as ColorThemeId];
  if (theme?.color) {
    effectiveStyle = {
      ...effectiveStyle,
      primaryColor: theme.color,
      secondaryColor: theme.color,
      accentColor: theme.color,
      ...(themeId !== 'default' ? { sidebarBg: theme.color, headerBg: theme.color } : {}),
    };
  }

  const templateProps = {
    style: effectiveStyle,
    personalInfo,
    education,
    experience,
    skills,
    projects,
  };

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
