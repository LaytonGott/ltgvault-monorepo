// Resume Template Configuration
// 10 REAL, DISTINCT templates based on actual resume best practices
// Each template has unique visual characteristics that MUST match in thumbnail, preview, and PDF

export const COLOR_THEMES = {
  default: { name: 'Black', color: '#000000' },
  navy: { name: 'Navy Blue', color: '#1e3a5f' },
  forest: { name: 'Forest Green', color: '#2d5a3d' },
  burgundy: { name: 'Burgundy', color: '#722f37' },
  teal: { name: 'Teal', color: '#0d9488' },
  purple: { name: 'Purple', color: '#5b21b6' },
} as const;

export type ColorThemeId = keyof typeof COLOR_THEMES;

// Template visual specifications
export interface TemplateSpec {
  id: string;
  name: string;
  description: string;

  // Layout
  layout: 'single' | 'twocolumn' | 'header';
  sidebarWidth?: number; // percentage for twocolumn
  sidebarPosition?: 'left' | 'right';

  // Typography
  fontFamily: 'serif' | 'sans-serif';
  bodyFontSize: number; // pt
  nameFontSize: number; // pt
  nameFontWeight: number; // 400, 600, 700
  nameAlignment: 'left' | 'center';

  // Colors
  primaryColor: string;
  accentColor: string;
  sidebarBg?: string;
  headerBg?: string;

  // Section Headers
  sectionHeaderStyle: 'caps-underline' | 'caps-thick-underline' | 'bold-gray-underline' | 'bold-spacing' | 'small-caps-center' | 'colored' | 'minimal';
  sectionHeaderColor: string;

  // Contact
  contactLayout: 'centered-pipes' | 'left-pipes' | 'stacked' | 'icons';
  contactDivider: boolean; // line under contact

  // Spacing
  margins: number; // inches
  sectionGap: number; // px
  entryGap: number; // px
  lineHeight: number;

  // Features
  isAtsFriendly: boolean;
  isCreative: boolean;
  isPro: boolean;

  // Special features
  educationFirst?: boolean; // Harvard style
  hasHeaderBar?: boolean; // Bold Header style
  hasAccentBar?: boolean; // Creative Modern style
  useDashBullets?: boolean; // Jake's style
}

// ============================================================
// THE 10 TEMPLATES
// ============================================================

export const TEMPLATES: TemplateSpec[] = [
  // ========================================
  // 1. HARVARD (DEFAULT)
  // ========================================
  {
    id: 'harvard',
    name: 'Harvard',
    description: 'Official Harvard career services format',
    layout: 'single',
    fontFamily: 'serif',
    bodyFontSize: 11,
    nameFontSize: 18,
    nameFontWeight: 700,
    nameAlignment: 'center',
    primaryColor: '#000000',
    accentColor: '#000000',
    sectionHeaderStyle: 'caps-underline',
    sectionHeaderColor: '#000000',
    contactLayout: 'centered-pipes',
    contactDivider: true,
    margins: 0.75,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    isAtsFriendly: true,
    isCreative: false,
    isPro: false,
    educationFirst: true,
  },

  // ========================================
  // 2. JAKE'S RESUME
  // ========================================
  {
    id: 'jakes',
    name: "Jake's Resume",
    description: 'Popular Overleaf LaTeX template',
    layout: 'single',
    fontFamily: 'sans-serif',
    bodyFontSize: 10,
    nameFontSize: 22,
    nameFontWeight: 700,
    nameAlignment: 'left',
    primaryColor: '#000000',
    accentColor: '#000000',
    sectionHeaderStyle: 'caps-thick-underline',
    sectionHeaderColor: '#000000',
    contactLayout: 'left-pipes',
    contactDivider: false,
    margins: 0.5,
    sectionGap: 12,
    entryGap: 6,
    lineHeight: 1.25,
    isAtsFriendly: true,
    isCreative: false,
    isPro: false,
    useDashBullets: true,
  },

  // ========================================
  // 3. CLASSIC PROFESSIONAL
  // ========================================
  {
    id: 'classic',
    name: 'Classic Professional',
    description: 'Traditional corporate style',
    layout: 'single',
    fontFamily: 'serif',
    bodyFontSize: 11,
    nameFontSize: 16,
    nameFontWeight: 700,
    nameAlignment: 'left',
    primaryColor: '#000000',
    accentColor: '#666666',
    sectionHeaderStyle: 'bold-gray-underline',
    sectionHeaderColor: '#000000',
    contactLayout: 'left-pipes',
    contactDivider: false,
    margins: 1.0,
    sectionGap: 18,
    entryGap: 12,
    lineHeight: 1.5,
    isAtsFriendly: true,
    isCreative: false,
    isPro: false,
  },

  // ========================================
  // 4. MODERN CLEAN
  // ========================================
  {
    id: 'modern',
    name: 'Modern Clean',
    description: 'Contemporary minimalist',
    layout: 'single',
    fontFamily: 'sans-serif',
    bodyFontSize: 10,
    nameFontSize: 18,
    nameFontWeight: 700,
    nameAlignment: 'left',
    primaryColor: '#1a1a2e',
    accentColor: '#1a1a2e',
    sectionHeaderStyle: 'bold-spacing',
    sectionHeaderColor: '#000000',
    contactLayout: 'left-pipes',
    contactDivider: false,
    margins: 0.7,
    sectionGap: 14,
    entryGap: 8,
    lineHeight: 1.35,
    isAtsFriendly: true,
    isCreative: false,
    isPro: true,
  },

  // ========================================
  // 5. TWO-COLUMN SIDEBAR
  // ========================================
  {
    id: 'sidebar',
    name: 'Two-Column Sidebar',
    description: 'Modern look with sidebar',
    layout: 'twocolumn',
    sidebarWidth: 30,
    sidebarPosition: 'left',
    fontFamily: 'sans-serif',
    bodyFontSize: 10,
    nameFontSize: 18,
    nameFontWeight: 700,
    nameAlignment: 'left',
    primaryColor: '#2c3e50',
    accentColor: '#2c3e50',
    sidebarBg: '#f5f5f5',
    sectionHeaderStyle: 'caps-underline',
    sectionHeaderColor: '#2c3e50',
    contactLayout: 'stacked',
    contactDivider: false,
    margins: 0,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    isAtsFriendly: false,
    isCreative: true,
    isPro: true,
  },

  // ========================================
  // 6. BOLD HEADER
  // ========================================
  {
    id: 'bold-header',
    name: 'Bold Header',
    description: 'Eye-catching top section',
    layout: 'header',
    fontFamily: 'sans-serif',
    bodyFontSize: 11,
    nameFontSize: 24,
    nameFontWeight: 700,
    nameAlignment: 'center',
    primaryColor: '#2c3e50',
    accentColor: '#2c3e50',
    headerBg: '#2c3e50',
    sectionHeaderStyle: 'colored',
    sectionHeaderColor: '#2c3e50',
    contactLayout: 'centered-pipes',
    contactDivider: false,
    margins: 0,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    isAtsFriendly: false,
    isCreative: true,
    isPro: true,
    hasHeaderBar: true,
  },

  // ========================================
  // 7. MINIMAL
  // ========================================
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Maximum whitespace, ultra-clean',
    layout: 'single',
    fontFamily: 'sans-serif',
    bodyFontSize: 10,
    nameFontSize: 20,
    nameFontWeight: 300,
    nameAlignment: 'left',
    primaryColor: '#333333',
    accentColor: '#999999',
    sectionHeaderStyle: 'minimal',
    sectionHeaderColor: '#999999',
    contactLayout: 'left-pipes',
    contactDivider: false,
    margins: 1.0,
    sectionGap: 24,
    entryGap: 14,
    lineHeight: 1.6,
    isAtsFriendly: true,
    isCreative: false,
    isPro: true,
  },

  // ========================================
  // 8. COMPACT
  // ========================================
  {
    id: 'compact',
    name: 'Compact',
    description: 'Fits maximum content',
    layout: 'single',
    fontFamily: 'sans-serif',
    bodyFontSize: 9,
    nameFontSize: 14,
    nameFontWeight: 700,
    nameAlignment: 'left',
    primaryColor: '#000000',
    accentColor: '#000000',
    sectionHeaderStyle: 'caps-underline',
    sectionHeaderColor: '#000000',
    contactLayout: 'left-pipes',
    contactDivider: true,
    margins: 0.5,
    sectionGap: 8,
    entryGap: 4,
    lineHeight: 1.2,
    isAtsFriendly: true,
    isCreative: false,
    isPro: true,
  },

  // ========================================
  // 9. CREATIVE MODERN
  // ========================================
  {
    id: 'creative',
    name: 'Creative Modern',
    description: 'For retail/service/creative roles',
    layout: 'single',
    fontFamily: 'sans-serif',
    bodyFontSize: 10,
    nameFontSize: 20,
    nameFontWeight: 700,
    nameAlignment: 'left',
    primaryColor: '#0d9488',
    accentColor: '#0d9488',
    sectionHeaderStyle: 'colored',
    sectionHeaderColor: '#0d9488',
    contactLayout: 'icons',
    contactDivider: false,
    margins: 0.75,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    isAtsFriendly: false,
    isCreative: true,
    isPro: true,
    hasAccentBar: true,
  },

  // ========================================
  // 10. EXECUTIVE
  // ========================================
  {
    id: 'executive',
    name: 'Executive',
    description: 'Premium professional look',
    layout: 'single',
    fontFamily: 'serif',
    bodyFontSize: 11,
    nameFontSize: 18,
    nameFontWeight: 700,
    nameAlignment: 'center',
    primaryColor: '#000000',
    accentColor: '#666666',
    sectionHeaderStyle: 'small-caps-center',
    sectionHeaderColor: '#000000',
    contactLayout: 'centered-pipes',
    contactDivider: true,
    margins: 1.0,
    sectionGap: 20,
    entryGap: 12,
    lineHeight: 1.5,
    isAtsFriendly: true,
    isCreative: false,
    isPro: true,
  },

  // ========================================
  // 11. MODERN SPLIT
  // ========================================
  {
    id: 'modern-split',
    name: 'Modern Split',
    description: 'Creative two-column with sidebar',
    layout: 'twocolumn',
    sidebarWidth: 35,
    sidebarPosition: 'left',
    fontFamily: 'serif',
    bodyFontSize: 10,
    nameFontSize: 20,
    nameFontWeight: 700,
    nameAlignment: 'left',
    primaryColor: '#2c3e50',
    accentColor: '#2c3e50',
    sidebarBg: '#f5f5f5',
    sectionHeaderStyle: 'colored',
    sectionHeaderColor: '#2c3e50',
    contactLayout: 'stacked',
    contactDivider: false,
    margins: 0,
    sectionGap: 14,
    entryGap: 10,
    lineHeight: 1.4,
    isAtsFriendly: false,
    isCreative: true,
    isPro: true,
  },

  // ========================================
  // 12. CLEAN CLASSIC
  // ========================================
  {
    id: 'clean-classic',
    name: 'Clean Classic',
    description: 'Most ATS-friendly, corporate ready',
    layout: 'single',
    fontFamily: 'sans-serif',
    bodyFontSize: 10,
    nameFontSize: 22,
    nameFontWeight: 700,
    nameAlignment: 'center',
    primaryColor: '#000000',
    accentColor: '#000000',
    sectionHeaderStyle: 'caps-underline',
    sectionHeaderColor: '#000000',
    contactLayout: 'icons',
    contactDivider: false,
    margins: 0.75,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    isAtsFriendly: true,
    isCreative: false,
    isPro: false,
  },

  // ========================================
  // 13. BOLD BANNER
  // ========================================
  {
    id: 'bold-banner',
    name: 'Bold Header',
    description: 'Eye-catching banner, great for students',
    layout: 'header',
    fontFamily: 'sans-serif',
    bodyFontSize: 10,
    nameFontSize: 24,
    nameFontWeight: 700,
    nameAlignment: 'center',
    primaryColor: '#2c3e50',
    accentColor: '#2c3e50',
    headerBg: '#2c3e50',
    sectionHeaderStyle: 'colored',
    sectionHeaderColor: '#2c3e50',
    contactLayout: 'centered-pipes',
    contactDivider: false,
    margins: 0,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    isAtsFriendly: false,
    isCreative: true,
    isPro: true,
    hasHeaderBar: true,
  },
];

// Default template
export const DEFAULT_TEMPLATE = 'harvard';

// Get template by ID
export function getTemplate(id: string): TemplateSpec {
  return TEMPLATES.find(t => t.id === id) || TEMPLATES[0];
}

// Legacy mapping for backwards compatibility
export const LEGACY_TEMPLATE_MAP: Record<string, string> = {
  'clean': 'harvard',
  'single-classic': 'classic',
  'single-modern': 'modern',
  'single-harvard': 'harvard',
  'single-jakes': 'jakes',
  'twocolumn-dark': 'sidebar',
  'twocolumn-light': 'sidebar',
  'twocolumn-modern': 'sidebar',
  'header-bold': 'bold-header',
  'compact-dense': 'compact',
  'mit': 'classic',
  'swiss': 'modern',
  'coral': 'creative',
};

// Get template config in OLD format (handles legacy IDs)
// Returns TemplateConfig with styleConfig for backwards compat with ResumePDF
export function getTemplateConfig(templateId: string): TemplateConfig {
  const mappedId = LEGACY_TEMPLATE_MAP[templateId] || templateId;
  return specToConfig(getTemplate(mappedId));
}

// Get free templates
export function getFreeTemplates(): TemplateSpec[] {
  return TEMPLATES.filter(t => !t.isPro);
}

// Get ATS-friendly templates
export function getAtsFriendlyTemplates(): TemplateSpec[] {
  return TEMPLATES.filter(t => t.isAtsFriendly);
}

// Get creative templates
export function getCreativeTemplates(): TemplateSpec[] {
  return TEMPLATES.filter(t => t.isCreative);
}

// Get effective colors with custom color theme
export function getEffectiveColors(templateId: string, colorTheme?: string | null) {
  const mappedId = LEGACY_TEMPLATE_MAP[templateId] || templateId;
  const template = getTemplate(mappedId);

  const themeId = colorTheme || 'default';
  const theme = COLOR_THEMES[themeId as ColorThemeId];
  const customColor = theme?.color || '#000000';

  if (themeId === 'default') {
    // Black (default): use black for text/accents but keep template sidebar/header styling
    return {
      primaryColor: customColor,
      accentColor: customColor,
      sidebarBg: template.sidebarBg || '#f5f5f5',
      headerBg: template.headerBg || customColor,
    };
  }

  return {
    primaryColor: customColor,
    accentColor: customColor,
    sidebarBg: customColor,
    headerBg: customColor,
  };
}

// For backwards compatibility with old code
export interface TemplateConfig {
  id: string;
  displayName: string;
  layout: string;
  style: string;
  layoutConfig: { id: string; name: string; description: string };
  styleConfig: {
    styleId: string;
    styleName: string;
    primaryColor: string;
    secondaryColor: string;
    textColor: string;
    lightText: string;
    accentColor: string;
    bgColor: string;
    sidebarBg?: string;
    headerBg?: string;
    headingFont: string;
    bodyFont: string;
    headingWeight: number;
    nameSize: number;
    nameWeight: number;
    nameLetterSpacing: number;
    nameUppercase: boolean;
    nameUnderline: boolean;
    nameUnderlineThickness: number;
    sectionSize: number;
    sectionUppercase: boolean;
    sectionLetterSpacing: number;
    sectionUnderline: boolean;
    sectionUnderlineThickness: number;
    sectionBackground: boolean;
    sectionDots: boolean;
    headerDivider: boolean;
    headerDividerThickness: number;
    entryDividers: boolean;
    useBullets: boolean;
    pageMargin: number;
    sectionGap: number;
    entryGap: number;
    lineHeight: number;
    sidebarWidth: number;
    sidebarFilled: boolean;
    sidebarBorderOnly: boolean;
    skillsStyle: string;
    datePosition: string;
    dateItalic: boolean;
  };
  isPro: boolean;
  hasPhoto?: boolean;
  isAtsFriendly?: boolean;
  isCreative?: boolean;
}

// TemplateStyle type alias for backwards compat (used by ResumePDF)
export type TemplateStyle = TemplateConfig['styleConfig'];

// Convert new spec to old format for backwards compatibility
export function specToConfig(spec: TemplateSpec): TemplateConfig {
  const isThickUnderline = spec.sectionHeaderStyle === 'caps-thick-underline';
  const hasUnderline = ['caps-underline', 'caps-thick-underline', 'bold-gray-underline', 'colored'].includes(spec.sectionHeaderStyle);
  const isCaps = ['caps-underline', 'caps-thick-underline', 'minimal'].includes(spec.sectionHeaderStyle);

  return {
    id: spec.id,
    displayName: spec.name,
    layout: spec.layout,
    style: spec.id,
    layoutConfig: { id: spec.layout, name: spec.name, description: spec.description },
    styleConfig: {
      styleId: spec.id,
      styleName: spec.name,
      primaryColor: spec.primaryColor,
      secondaryColor: spec.accentColor,
      textColor: '#000000',
      lightText: '#666666',
      accentColor: spec.accentColor,
      bgColor: '#ffffff',
      sidebarBg: spec.sidebarBg,
      headerBg: spec.headerBg,
      headingFont: spec.fontFamily === 'serif' ? 'Times-Bold' : 'Helvetica-Bold',
      bodyFont: spec.fontFamily === 'serif' ? 'Times-Roman' : 'Helvetica',
      headingWeight: spec.nameFontWeight,
      nameSize: spec.nameFontSize,
      nameWeight: spec.nameFontWeight,
      nameLetterSpacing: 0,
      nameUppercase: false,
      nameUnderline: false,
      nameUnderlineThickness: 0,
      sectionSize: 11,
      sectionUppercase: isCaps,
      sectionLetterSpacing: spec.sectionHeaderStyle === 'minimal' ? 2 : 0,
      sectionUnderline: hasUnderline,
      sectionUnderlineThickness: isThickUnderline ? 2 : 1,
      sectionBackground: false,
      sectionDots: false,
      headerDivider: spec.contactDivider,
      headerDividerThickness: 1,
      entryDividers: false,
      useBullets: !spec.useDashBullets,
      pageMargin: spec.margins * 48,
      sectionGap: spec.sectionGap,
      entryGap: spec.entryGap,
      lineHeight: spec.lineHeight,
      sidebarWidth: spec.sidebarWidth || 30,
      sidebarFilled: !!spec.sidebarBg,
      sidebarBorderOnly: false,
      skillsStyle: 'commas',
      datePosition: 'right',
      dateItalic: false,
    },
    isPro: spec.isPro,
    isAtsFriendly: spec.isAtsFriendly,
    isCreative: spec.isCreative,
  };
}

// Get all templates in old format
export function getAllTemplateConfigs(): TemplateConfig[] {
  return TEMPLATES.map(specToConfig);
}

// Layouts for backwards compat
export const LAYOUTS = [
  { id: 'single', name: 'Single Column', description: 'Classic ATS-friendly format' },
  { id: 'twocolumn', name: 'Two Column', description: 'Sidebar with main content' },
  { id: 'header', name: 'Header Focus', description: 'Bold header design' },
];

// Get templates by layout
export function getTemplatesByLayout(): Record<string, TemplateSpec[]> {
  const grouped: Record<string, TemplateSpec[]> = {};
  LAYOUTS.forEach(layout => {
    grouped[layout.id] = TEMPLATES.filter(t => t.layout === layout.id);
  });
  return grouped;
}
