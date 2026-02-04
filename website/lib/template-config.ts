// Resume Template Configuration
// Based on REAL, well-known resume templates from Harvard, Reddit, Google Docs, Canva, etc.
// Each template replicates the EXACT format of the original

// Color theme options for Pro users
export const COLOR_THEMES = {
  default: { name: 'Default', color: null },
  navy: { name: 'Navy Blue', color: '#1e3a5f' },
  forest: { name: 'Forest Green', color: '#2d5a3d' },
  burgundy: { name: 'Burgundy', color: '#722f37' },
  teal: { name: 'Teal', color: '#0d9488' },
  purple: { name: 'Purple', color: '#5b21b6' },
  slate: { name: 'Slate', color: '#475569' },
} as const;

export type ColorThemeId = keyof typeof COLOR_THEMES;

export interface TemplateStyle {
  styleId: string;
  styleName: string;
  // COLORS
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  lightText: string;
  accentColor: string;
  bgColor: string;
  sidebarBg?: string;
  headerBg?: string;
  // FONTS
  headingFont: string;
  bodyFont: string;
  headingWeight: number;
  // NAME STYLING
  nameSize: number;
  nameWeight: number;
  nameLetterSpacing: number;
  nameUppercase: boolean;
  nameUnderline: boolean;
  nameUnderlineThickness: number;
  nameCentered?: boolean; // NEW: for Harvard-style centered name
  // SECTION HEADERS
  sectionSize: number;
  sectionUppercase: boolean;
  sectionLetterSpacing: number;
  sectionUnderline: boolean;
  sectionUnderlineThickness: number;
  sectionBackground: boolean;
  sectionDots: boolean;
  // DIVIDERS & DECORATIONS
  headerDivider: boolean;
  headerDividerThickness: number;
  entryDividers: boolean;
  useBullets: boolean;
  // SPACING
  pageMargin: number;
  sectionGap: number;
  entryGap: number;
  lineHeight: number;
  // TWO-COLUMN SPECIFIC
  sidebarWidth: number;
  sidebarFilled: boolean;
  sidebarBorderOnly: boolean;
  // SKILLS DISPLAY
  skillsStyle: 'chips' | 'inline' | 'bullets' | 'commas';
  // DATE DISPLAY
  datePosition: 'right' | 'below' | 'inline';
  dateItalic: boolean;
  // SPECIAL FEATURES
  helloHeader?: boolean; // For Coral-style "Hello, I'm..." header
  skillsFirst?: boolean; // For Swiss-style skills-first layout
}

export interface TemplateLayout {
  id: string;
  name: string;
  description: string;
}

export const LAYOUTS: TemplateLayout[] = [
  { id: 'single', name: 'Single Column', description: 'Classic ATS-friendly format' },
  { id: 'twocolumn', name: 'Two Column', description: 'Sidebar with main content' },
  { id: 'header', name: 'Header Focus', description: 'Bold header design' },
  { id: 'compact', name: 'Compact', description: 'Dense, information-packed' },
  { id: 'split', name: 'Modern Split', description: 'Creative asymmetric design' },
];

// ============================================================
// REAL TEMPLATE STYLES - Based on actual well-known templates
// ============================================================

export const STYLES: Record<string, TemplateStyle> = {

  // ========================================
  // HARVARD RESUME - Official Harvard OCS format
  // Serif font, centered name, thin underlines
  // Source: careerservices.fas.harvard.edu
  // ========================================
  harvard: {
    styleId: 'harvard',
    styleName: 'Harvard',
    primaryColor: '#000000',
    secondaryColor: '#000000',
    textColor: '#000000',
    lightText: '#333333',
    accentColor: '#000000',
    bgColor: '#ffffff',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    // Times New Roman is the official Harvard font
    headingFont: 'Times-Bold',
    bodyFont: 'Times-Roman',
    headingWeight: 700,
    // Name: centered, bold, NOT uppercase
    nameSize: 24,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: true, // CENTERED name
    // Sections: ALL CAPS with thin underline
    sectionSize: 11,
    sectionUppercase: true,
    sectionLetterSpacing: 0.5,
    sectionUnderline: true,
    sectionUnderlineThickness: 1,
    sectionBackground: false,
    sectionDots: false,
    // Dividers: thin line under contact
    headerDivider: true,
    headerDividerThickness: 1,
    entryDividers: false,
    useBullets: true,
    // Spacing: professional, not too tight
    pageMargin: 48,
    sectionGap: 14,
    entryGap: 8,
    lineHeight: 1.4,
    // Not applicable for single column
    sidebarWidth: 30,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    skillsStyle: 'commas',
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // JAKE'S RESUME - Popular Reddit/Overleaf template
  // Sans-serif, left-aligned LARGE name, thick underlines
  // Source: overleaf.com/latex/templates/jakes-resume
  // ========================================
  jakes: {
    styleId: 'jakes',
    styleName: "Jake's",
    primaryColor: '#000000',
    secondaryColor: '#000000',
    textColor: '#000000',
    lightText: '#444444',
    accentColor: '#000000',
    bgColor: '#ffffff',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    // Helvetica/Computer Modern sans-serif
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    // Name: left-aligned, LARGE, bold
    nameSize: 28, // Larger than Harvard
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false, // LEFT aligned
    // Sections: ALL CAPS with THICK underline (full width)
    sectionSize: 11,
    sectionUppercase: true,
    sectionLetterSpacing: 1,
    sectionUnderline: true,
    sectionUnderlineThickness: 2, // THICK line
    sectionBackground: false,
    sectionDots: false,
    // NO line under contact (distinguishes from Harvard)
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: true,
    // Spacing: COMPACT
    pageMargin: 36,
    sectionGap: 10,
    entryGap: 6,
    lineHeight: 1.25,
    sidebarWidth: 30,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    skillsStyle: 'commas',
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // GOOGLE DOCS SWISS - Skills-first, orange accent
  // Source: Google Docs built-in templates
  // ========================================
  swiss: {
    styleId: 'swiss',
    styleName: 'Swiss',
    primaryColor: '#ea580c', // Orange
    secondaryColor: '#f97316',
    textColor: '#1f2937',
    lightText: '#6b7280',
    accentColor: '#ea580c',
    bgColor: '#ffffff',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    // Name: left-aligned, medium
    nameSize: 24,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    // Sections: simple with horizontal line dividers
    sectionSize: 12,
    sectionUppercase: true,
    sectionLetterSpacing: 1,
    sectionUnderline: true,
    sectionUnderlineThickness: 2,
    sectionBackground: false,
    sectionDots: false,
    // Line dividers
    headerDivider: true,
    headerDividerThickness: 2,
    entryDividers: false,
    useBullets: false, // Swiss uses paragraphs, not bullets
    // Moderate spacing
    pageMargin: 48,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.5,
    sidebarWidth: 30,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    skillsStyle: 'inline', // Skills inline with bullets
    skillsFirst: true, // Skills section near top
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // GOOGLE DOCS CORAL - "Hello, I'm" header, coral accent
  // Source: Google Docs built-in templates
  // ========================================
  coral: {
    styleId: 'coral',
    styleName: 'Coral',
    primaryColor: '#f87171', // Coral color
    secondaryColor: '#fca5a5',
    textColor: '#1f2937',
    lightText: '#6b7280',
    accentColor: '#f87171',
    bgColor: '#ffffff',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    // Playfair Display style serif for name
    headingFont: 'Times-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 400, // Lighter weight
    // Name: "Hello, I'm [Name]" style
    nameSize: 26,
    nameWeight: 400,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    helloHeader: true, // Special "Hello, I'm" format
    // Sections: coral colored titles
    sectionSize: 11,
    sectionUppercase: false,
    sectionLetterSpacing: 0,
    sectionUnderline: false,
    sectionUnderlineThickness: 0,
    sectionBackground: false,
    sectionDots: false,
    // No header divider
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: true,
    pageMargin: 48,
    sectionGap: 18,
    entryGap: 12,
    lineHeight: 1.5,
    sidebarWidth: 30,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    skillsStyle: 'commas',
    datePosition: 'below',
    dateItalic: true,
  },

  // ========================================
  // MIT RESUME - Clean, professional, quantitative
  // Source: capd.mit.edu
  // ========================================
  mit: {
    styleId: 'mit',
    styleName: 'MIT',
    primaryColor: '#1f2937',
    secondaryColor: '#374151',
    textColor: '#1f2937',
    lightText: '#6b7280',
    accentColor: '#1f2937',
    bgColor: '#ffffff',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    nameSize: 22,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    sectionSize: 11,
    sectionUppercase: true,
    sectionLetterSpacing: 0.5,
    sectionUnderline: true,
    sectionUnderlineThickness: 1,
    sectionBackground: false,
    sectionDots: false,
    headerDivider: true,
    headerDividerThickness: 1,
    entryDividers: false,
    useBullets: true,
    pageMargin: 48,
    sectionGap: 14,
    entryGap: 8,
    lineHeight: 1.4,
    sidebarWidth: 30,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    skillsStyle: 'commas',
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // SIDEBAR DARK - Dark navy blue sidebar
  // Canva-inspired two-column design
  // ========================================
  sidebarDark: {
    styleId: 'sidebarDark',
    styleName: 'Dark Sidebar',
    primaryColor: '#1e3a5f', // Navy blue
    secondaryColor: '#2d5a87',
    textColor: '#1f2937',
    lightText: '#6b7280',
    accentColor: '#1e3a5f',
    bgColor: '#ffffff',
    sidebarBg: '#1e3a5f', // Dark navy
    headerBg: '#1e3a5f',
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    nameSize: 20,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    sectionSize: 10,
    sectionUppercase: true,
    sectionLetterSpacing: 1,
    sectionUnderline: true,
    sectionUnderlineThickness: 1,
    sectionBackground: false,
    sectionDots: false,
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: true,
    pageMargin: 0,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    sidebarWidth: 32,
    sidebarFilled: true,
    sidebarBorderOnly: false,
    skillsStyle: 'chips',
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // SIDEBAR LIGHT - Light gray sidebar
  // ========================================
  sidebarLight: {
    styleId: 'sidebarLight',
    styleName: 'Light Sidebar',
    primaryColor: '#374151',
    secondaryColor: '#6b7280',
    textColor: '#1f2937',
    lightText: '#6b7280',
    accentColor: '#374151',
    bgColor: '#ffffff',
    sidebarBg: '#f3f4f6', // Light gray
    headerBg: '#f3f4f6',
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 600,
    nameSize: 20,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    sectionSize: 10,
    sectionUppercase: true,
    sectionLetterSpacing: 0.5,
    sectionUnderline: true,
    sectionUnderlineThickness: 1,
    sectionBackground: false,
    sectionDots: false,
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: true,
    pageMargin: 0,
    sectionGap: 14,
    entryGap: 8,
    lineHeight: 1.4,
    sidebarWidth: 30,
    sidebarFilled: true,
    sidebarBorderOnly: false,
    skillsStyle: 'commas',
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // SIDEBAR TEAL - Teal/green sidebar
  // ========================================
  sidebarTeal: {
    styleId: 'sidebarTeal',
    styleName: 'Teal Sidebar',
    primaryColor: '#0d9488',
    secondaryColor: '#14b8a6',
    textColor: '#1f2937',
    lightText: '#6b7280',
    accentColor: '#0d9488',
    bgColor: '#ffffff',
    sidebarBg: '#0d9488', // Teal
    headerBg: '#0d9488',
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    nameSize: 20,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    sectionSize: 10,
    sectionUppercase: true,
    sectionLetterSpacing: 1,
    sectionUnderline: false,
    sectionUnderlineThickness: 0,
    sectionBackground: true, // Filled section headers
    sectionDots: false,
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: true,
    pageMargin: 0,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    sidebarWidth: 35,
    sidebarFilled: true,
    sidebarBorderOnly: false,
    skillsStyle: 'chips',
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // HEADER BOLD - Large colored header banner
  // ========================================
  headerBold: {
    styleId: 'headerBold',
    styleName: 'Bold Header',
    primaryColor: '#1e3a5f',
    secondaryColor: '#2d5a87',
    textColor: '#1f2937',
    lightText: '#6b7280',
    accentColor: '#1e3a5f',
    bgColor: '#ffffff',
    sidebarBg: '#ffffff',
    headerBg: '#1e3a5f', // Dark header
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    nameSize: 28,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    sectionSize: 11,
    sectionUppercase: true,
    sectionLetterSpacing: 1,
    sectionUnderline: false,
    sectionUnderlineThickness: 0,
    sectionBackground: true,
    sectionDots: false,
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: true,
    pageMargin: 0,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    sidebarWidth: 30,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    skillsStyle: 'chips',
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // COMPACT DENSE - Maximum information density
  // Academic CV style
  // ========================================
  compactDense: {
    styleId: 'compactDense',
    styleName: 'Dense',
    primaryColor: '#1f2937',
    secondaryColor: '#374151',
    textColor: '#1f2937',
    lightText: '#6b7280',
    accentColor: '#1f2937',
    bgColor: '#ffffff',
    sidebarBg: '#ffffff',
    headerBg: '#ffffff',
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    nameSize: 18,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    sectionSize: 9,
    sectionUppercase: true,
    sectionLetterSpacing: 0.5,
    sectionUnderline: true,
    sectionUnderlineThickness: 1,
    sectionBackground: false,
    sectionDots: false,
    headerDivider: true,
    headerDividerThickness: 1,
    entryDividers: false,
    useBullets: true,
    pageMargin: 32,
    sectionGap: 8,
    entryGap: 4,
    lineHeight: 1.2,
    sidebarWidth: 30,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    skillsStyle: 'commas',
    datePosition: 'right',
    dateItalic: false,
  },

  // ========================================
  // MINIMAL - Clean, lots of whitespace
  // ========================================
  minimal: {
    styleId: 'minimal',
    styleName: 'Minimal',
    primaryColor: '#6b7280',
    secondaryColor: '#9ca3af',
    textColor: '#374151',
    lightText: '#9ca3af',
    accentColor: '#6b7280',
    bgColor: '#ffffff',
    sidebarBg: '#fafafa',
    headerBg: '#fafafa',
    headingFont: 'Helvetica',
    bodyFont: 'Helvetica',
    headingWeight: 400,
    nameSize: 24,
    nameWeight: 300,
    nameLetterSpacing: 2,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    nameCentered: false,
    sectionSize: 10,
    sectionUppercase: false,
    sectionLetterSpacing: 0,
    sectionUnderline: false,
    sectionUnderlineThickness: 0,
    sectionBackground: false,
    sectionDots: false,
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: false,
    pageMargin: 56,
    sectionGap: 28,
    entryGap: 16,
    lineHeight: 1.6,
    sidebarWidth: 22,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    skillsStyle: 'commas',
    datePosition: 'right',
    dateItalic: false,
  },
};

// ============================================================
// TEMPLATE CONFIGURATION
// ============================================================

export interface TemplateConfig {
  id: string;
  displayName: string;
  layout: string;
  style: string;
  layoutConfig: TemplateLayout;
  styleConfig: TemplateStyle;
  isPro: boolean;
  hasPhoto?: boolean;
  isAtsFriendly?: boolean;
  isCreative?: boolean;
}

export const TEMPLATES: TemplateConfig[] = [];

// Helper functions
function isAtsFriendlyTemplate(layout: string, style: string): boolean {
  if (layout === 'single' && ['harvard', 'jakes', 'mit', 'swiss', 'coral'].includes(style)) return true;
  if (layout === 'compact') return true;
  return false;
}

function isCreativeTemplate(layout: string, style: string): boolean {
  if (['twocolumn', 'header', 'split'].includes(layout)) return true;
  if (['coral'].includes(style)) return true;
  return false;
}

// Add ATS-friendly single column templates (FREE)
const singleLayout = LAYOUTS.find(l => l.id === 'single')!;

TEMPLATES.push({
  id: 'harvard',
  displayName: 'Harvard',
  layout: 'single',
  style: 'harvard',
  layoutConfig: singleLayout,
  styleConfig: STYLES.harvard,
  isPro: false,
  isAtsFriendly: true,
  isCreative: false,
});

TEMPLATES.push({
  id: 'jakes',
  displayName: "Jake's Resume",
  layout: 'single',
  style: 'jakes',
  layoutConfig: singleLayout,
  styleConfig: STYLES.jakes,
  isPro: false,
  isAtsFriendly: true,
  isCreative: false,
});

TEMPLATES.push({
  id: 'mit',
  displayName: 'MIT',
  layout: 'single',
  style: 'mit',
  layoutConfig: singleLayout,
  styleConfig: STYLES.mit,
  isPro: false,
  isAtsFriendly: true,
  isCreative: false,
});

TEMPLATES.push({
  id: 'swiss',
  displayName: 'Swiss',
  layout: 'single',
  style: 'swiss',
  layoutConfig: singleLayout,
  styleConfig: STYLES.swiss,
  isPro: true,
  isAtsFriendly: true,
  isCreative: false,
});

TEMPLATES.push({
  id: 'coral',
  displayName: 'Coral',
  layout: 'single',
  style: 'coral',
  layoutConfig: singleLayout,
  styleConfig: STYLES.coral,
  isPro: true,
  isAtsFriendly: true,
  isCreative: true,
});

TEMPLATES.push({
  id: 'minimal',
  displayName: 'Minimal',
  layout: 'single',
  style: 'minimal',
  layoutConfig: singleLayout,
  styleConfig: STYLES.minimal,
  isPro: true,
  isAtsFriendly: true,
  isCreative: false,
});

// Add two-column templates (PRO)
const twocolumnLayout = LAYOUTS.find(l => l.id === 'twocolumn')!;

TEMPLATES.push({
  id: 'twocolumn-dark',
  displayName: 'Dark Sidebar',
  layout: 'twocolumn',
  style: 'sidebarDark',
  layoutConfig: twocolumnLayout,
  styleConfig: STYLES.sidebarDark,
  isPro: true,
  hasPhoto: true,
  isAtsFriendly: false,
  isCreative: true,
});

TEMPLATES.push({
  id: 'twocolumn-light',
  displayName: 'Light Sidebar',
  layout: 'twocolumn',
  style: 'sidebarLight',
  layoutConfig: twocolumnLayout,
  styleConfig: STYLES.sidebarLight,
  isPro: true,
  hasPhoto: true,
  isAtsFriendly: false,
  isCreative: true,
});

TEMPLATES.push({
  id: 'twocolumn-teal',
  displayName: 'Teal Sidebar',
  layout: 'twocolumn',
  style: 'sidebarTeal',
  layoutConfig: twocolumnLayout,
  styleConfig: STYLES.sidebarTeal,
  isPro: true,
  hasPhoto: true,
  isAtsFriendly: false,
  isCreative: true,
});

// Add header focus templates (PRO)
const headerLayout = LAYOUTS.find(l => l.id === 'header')!;

TEMPLATES.push({
  id: 'header-bold',
  displayName: 'Bold Header',
  layout: 'header',
  style: 'headerBold',
  layoutConfig: headerLayout,
  styleConfig: STYLES.headerBold,
  isPro: true,
  hasPhoto: true,
  isAtsFriendly: false,
  isCreative: true,
});

// Add compact templates (PRO)
const compactLayout = LAYOUTS.find(l => l.id === 'compact')!;

TEMPLATES.push({
  id: 'compact-dense',
  displayName: 'Dense Compact',
  layout: 'compact',
  style: 'compactDense',
  layoutConfig: compactLayout,
  styleConfig: STYLES.compactDense,
  isPro: true,
  isAtsFriendly: true,
  isCreative: false,
});

// Default template
export const DEFAULT_TEMPLATE = 'harvard';

// Legacy mapping for backwards compatibility
export const LEGACY_TEMPLATE_MAP: Record<string, string> = {
  'clean': 'harvard',
  'modern': 'twocolumn-dark',
  'professional': 'mit',
  'bold': 'header-bold',
  'compact': 'compact-dense',
  'single-classic': 'harvard',
  'single-modern': 'swiss',
  'single-bold': 'jakes',
  'single-harvard': 'harvard',
  'single-jakes': 'jakes',
  'twocolumn-modern': 'twocolumn-dark',
  'twocolumn-bold': 'twocolumn-teal',
  'twocolumn-classic': 'twocolumn-light',
  'header-modern': 'header-bold',
};

// Get template config by ID
export function getTemplateConfig(templateId: string): TemplateConfig {
  const mappedId = LEGACY_TEMPLATE_MAP[templateId] || templateId;
  const config = TEMPLATES.find(t => t.id === mappedId);
  return config || TEMPLATES.find(t => t.id === 'harvard')!;
}

// Utility functions
export function getAllTemplateIds(): string[] {
  return TEMPLATES.map(t => t.id);
}

export function getFreeTemplateIds(): string[] {
  return TEMPLATES.filter(t => !t.isPro).map(t => t.id);
}

export function getProTemplateIds(): string[] {
  return TEMPLATES.filter(t => t.isPro).map(t => t.id);
}

export function getEffectiveColors(templateId: string, colorTheme?: string | null): {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarBg: string;
  headerBg: string;
} {
  const config = getTemplateConfig(templateId);
  const style = config.styleConfig;

  if (!colorTheme || colorTheme === 'default') {
    return {
      primaryColor: style.primaryColor,
      secondaryColor: style.secondaryColor,
      accentColor: style.accentColor,
      sidebarBg: style.sidebarBg || style.primaryColor,
      headerBg: style.headerBg || style.primaryColor,
    };
  }

  const theme = COLOR_THEMES[colorTheme as ColorThemeId];
  const customColor = theme?.color || style.primaryColor;

  return {
    primaryColor: customColor,
    secondaryColor: customColor,
    accentColor: customColor,
    sidebarBg: customColor,
    headerBg: customColor,
  };
}

export function getTemplatesByLayout(): Record<string, TemplateConfig[]> {
  const grouped: Record<string, TemplateConfig[]> = {};
  LAYOUTS.forEach(layout => {
    grouped[layout.id] = TEMPLATES.filter(t => t.layout === layout.id);
  });
  return grouped;
}
