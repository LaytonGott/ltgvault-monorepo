// Resume Template Configuration
// 5 Base Layouts × 5 Style Variants = 25 Templates
// Each variant has DRAMATIC STRUCTURAL differences - not just colors

// Color theme options for Pro users
export const COLOR_THEMES = {
  default: { name: 'Default', color: null }, // Uses template's default color
  navy: { name: 'Navy Blue', color: '#1e3a5f' },
  forest: { name: 'Forest Green', color: '#2d5a3d' },
  burgundy: { name: 'Burgundy', color: '#722f37' },
  teal: { name: 'Teal', color: '#0d9488' },
  purple: { name: 'Purple', color: '#5b21b6' },
  black: { name: 'Black', color: '#1f2937' },
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

  // FONTS - each style uses different font families
  headingFont: string;
  bodyFont: string;
  headingWeight: number;

  // NAME STYLING
  nameSize: number;       // Font size for name
  nameWeight: number;     // Font weight
  nameLetterSpacing: number;
  nameUppercase: boolean;
  nameUnderline: boolean;  // Line under name
  nameUnderlineThickness: number;

  // SECTION HEADERS
  sectionSize: number;
  sectionUppercase: boolean;
  sectionLetterSpacing: number;
  sectionUnderline: boolean;
  sectionUnderlineThickness: number;
  sectionBackground: boolean;  // Full background color on section headers
  sectionDots: boolean;        // Decorative dots after section title

  // DIVIDERS & DECORATIONS
  headerDivider: boolean;      // Line after contact info
  headerDividerThickness: number;
  entryDividers: boolean;      // Lines between entries
  useBullets: boolean;         // Bullet points for descriptions

  // SPACING
  pageMargin: number;
  sectionGap: number;
  entryGap: number;
  lineHeight: number;

  // TWO-COLUMN SPECIFIC
  sidebarWidth: number;        // Percentage width of sidebar (25-45)
  sidebarFilled: boolean;      // Filled background vs border/minimal
  sidebarBorderOnly: boolean;  // Just a border, no fill

  // SKILLS DISPLAY
  skillsStyle: 'chips' | 'inline' | 'bullets' | 'commas';

  // DATE DISPLAY
  datePosition: 'right' | 'below' | 'inline';
  dateItalic: boolean;
}

export interface TemplateLayout {
  id: string;
  name: string;
  description: string;
}

// 5 Base Layouts
export const LAYOUTS: TemplateLayout[] = [
  { id: 'single', name: 'Single Column', description: 'Classic vertical flow' },
  { id: 'twocolumn', name: 'Two Column', description: 'Sidebar with main content' },
  { id: 'header', name: 'Header Focus', description: 'Bold header design' },
  { id: 'compact', name: 'Compact', description: 'Dense layout for more content' },
  { id: 'split', name: 'Modern Split', description: 'Creative asymmetric design' },
];

// ============================================================
// 5 STYLE VARIANTS - Each dramatically different
// ============================================================

export const STYLES: Record<string, TemplateStyle> = {
  // CLASSIC: Traditional, serif fonts, thin lines, conservative
  classic: {
    styleId: 'classic',
    styleName: 'Classic',
    primaryColor: '#1a1a1a',
    secondaryColor: '#333333',
    textColor: '#222222',
    lightText: '#666666',
    accentColor: '#1a1a1a',
    bgColor: '#ffffff',
    sidebarBg: '#f5f5f5',
    headerBg: '#1a1a1a',
    headingFont: 'Times-Bold',
    bodyFont: 'Times-Roman',
    headingWeight: 700,
    // Name
    nameSize: 22,
    nameWeight: 700,
    nameLetterSpacing: 0,
    nameUppercase: false,
    nameUnderline: true,
    nameUnderlineThickness: 1,
    // Sections
    sectionSize: 11,
    sectionUppercase: true,
    sectionLetterSpacing: 1,
    sectionUnderline: true,
    sectionUnderlineThickness: 1,
    sectionBackground: false,
    sectionDots: false,
    // Dividers
    headerDivider: true,
    headerDividerThickness: 1,
    entryDividers: false,
    useBullets: false,
    // Spacing
    pageMargin: 48,
    sectionGap: 16,
    entryGap: 10,
    lineHeight: 1.4,
    // Two-column
    sidebarWidth: 30,
    sidebarFilled: true,
    sidebarBorderOnly: false,
    // Skills
    skillsStyle: 'commas',
    datePosition: 'right',
    dateItalic: false,
  },

  // MODERN: Clean sans-serif, bold headers, no decorative lines
  modern: {
    styleId: 'modern',
    styleName: 'Modern',
    primaryColor: '#1e3a5f',
    secondaryColor: '#2d5a87',
    textColor: '#1a1a1a',
    lightText: '#555555',
    accentColor: '#1e3a5f',
    bgColor: '#ffffff',
    sidebarBg: '#1e3a5f',
    headerBg: '#1e3a5f',
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    // Name
    nameSize: 28,
    nameWeight: 700,
    nameLetterSpacing: -1,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    // Sections
    sectionSize: 12,
    sectionUppercase: true,
    sectionLetterSpacing: 2,
    sectionUnderline: false,
    sectionUnderlineThickness: 0,
    sectionBackground: false,
    sectionDots: false,
    // Dividers
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: true,
    // Spacing
    pageMargin: 48,
    sectionGap: 20,
    entryGap: 12,
    lineHeight: 1.5,
    // Two-column
    sidebarWidth: 32,
    sidebarFilled: true,
    sidebarBorderOnly: false,
    // Skills
    skillsStyle: 'chips',
    datePosition: 'right',
    dateItalic: false,
  },

  // BOLD: Chunky elements, thick bars, large typography
  bold: {
    styleId: 'bold',
    styleName: 'Bold',
    primaryColor: '#0d9488',
    secondaryColor: '#14b8a6',
    textColor: '#1a1a1a',
    lightText: '#555555',
    accentColor: '#0d9488',
    bgColor: '#ffffff',
    sidebarBg: '#0d9488',
    headerBg: '#0d9488',
    headingFont: 'Helvetica-Bold',
    bodyFont: 'Helvetica',
    headingWeight: 700,
    // Name
    nameSize: 32,
    nameWeight: 700,
    nameLetterSpacing: -1,
    nameUppercase: false,
    nameUnderline: true,
    nameUnderlineThickness: 4,
    // Sections
    sectionSize: 11,
    sectionUppercase: true,
    sectionLetterSpacing: 1,
    sectionUnderline: false,
    sectionUnderlineThickness: 0,
    sectionBackground: true,
    sectionDots: false,
    // Dividers
    headerDivider: true,
    headerDividerThickness: 4,
    entryDividers: true,
    useBullets: true,
    // Spacing
    pageMargin: 44,
    sectionGap: 18,
    entryGap: 14,
    lineHeight: 1.5,
    // Two-column
    sidebarWidth: 38,
    sidebarFilled: true,
    sidebarBorderOnly: false,
    // Skills
    skillsStyle: 'chips',
    datePosition: 'inline',
    dateItalic: false,
  },

  // ELEGANT: Refined, light weight, extra spacing, subtle accents
  elegant: {
    styleId: 'elegant',
    styleName: 'Elegant',
    primaryColor: '#7c2d36',
    secondaryColor: '#d4a5ab',
    textColor: '#2d2d2d',
    lightText: '#888888',
    accentColor: '#7c2d36',
    bgColor: '#ffffff',
    sidebarBg: '#faf8f8',
    headerBg: '#7c2d36',
    headingFont: 'Times-Bold',
    bodyFont: 'Times-Roman',
    headingWeight: 400,
    // Name
    nameSize: 26,
    nameWeight: 400,
    nameLetterSpacing: 4,
    nameUppercase: true,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    // Sections
    sectionSize: 9,
    sectionUppercase: true,
    sectionLetterSpacing: 4,
    sectionUnderline: false,
    sectionUnderlineThickness: 0,
    sectionBackground: false,
    sectionDots: true,
    // Dividers
    headerDivider: true,
    headerDividerThickness: 1,
    entryDividers: false,
    useBullets: false,
    // Spacing
    pageMargin: 56,
    sectionGap: 24,
    entryGap: 14,
    lineHeight: 1.6,
    // Two-column
    sidebarWidth: 28,
    sidebarFilled: false,
    sidebarBorderOnly: true,
    // Skills
    skillsStyle: 'inline',
    datePosition: 'below',
    dateItalic: true,
  },

  // MINIMAL: Maximum whitespace, no decoration, pure typography
  minimal: {
    styleId: 'minimal',
    styleName: 'Minimal',
    primaryColor: '#666666',
    secondaryColor: '#999999',
    textColor: '#333333',
    lightText: '#999999',
    accentColor: '#666666',
    bgColor: '#ffffff',
    sidebarBg: '#fafafa',
    headerBg: '#f5f5f5',
    headingFont: 'Helvetica',
    bodyFont: 'Helvetica',
    headingWeight: 400,
    // Name
    nameSize: 24,
    nameWeight: 300,
    nameLetterSpacing: 2,
    nameUppercase: false,
    nameUnderline: false,
    nameUnderlineThickness: 0,
    // Sections
    sectionSize: 10,
    sectionUppercase: false,
    sectionLetterSpacing: 0,
    sectionUnderline: false,
    sectionUnderlineThickness: 0,
    sectionBackground: false,
    sectionDots: false,
    // Dividers
    headerDivider: false,
    headerDividerThickness: 0,
    entryDividers: false,
    useBullets: false,
    // Spacing
    pageMargin: 56,
    sectionGap: 28,
    entryGap: 16,
    lineHeight: 1.6,
    // Two-column
    sidebarWidth: 22,
    sidebarFilled: false,
    sidebarBorderOnly: false,
    // Skills
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
}

export const TEMPLATES: TemplateConfig[] = [];

// Generate all 25 combinations
LAYOUTS.forEach(layout => {
  Object.entries(STYLES).forEach(([styleId, styleConfig]) => {
    const templateId = `${layout.id}-${styleId}`;
    TEMPLATES.push({
      id: templateId,
      displayName: `${layout.name} ${styleConfig.styleName}`,
      layout: layout.id,
      style: styleId,
      layoutConfig: layout,
      styleConfig: styleConfig,
      // Only single-classic is free
      isPro: templateId !== 'single-classic',
    });
  });
});

// Map old template names to new ones for backwards compatibility
export const LEGACY_TEMPLATE_MAP: Record<string, string> = {
  'clean': 'single-classic',
  'modern': 'twocolumn-modern',
  'professional': 'single-elegant',
  'bold': 'header-bold',
  'minimal': 'single-minimal',
  'compact': 'compact-classic',
};

// Get template config by ID (handles legacy names)
export function getTemplateConfig(templateId: string): TemplateConfig {
  const mappedId = LEGACY_TEMPLATE_MAP[templateId] || templateId;
  const config = TEMPLATES.find(t => t.id === mappedId);
  return config || TEMPLATES.find(t => t.id === 'single-classic')!;
}

// Get all template IDs
export function getAllTemplateIds(): string[] {
  return TEMPLATES.map(t => t.id);
}

// Get free template IDs
export function getFreeTemplateIds(): string[] {
  return TEMPLATES.filter(t => !t.isPro).map(t => t.id);
}

// Get pro template IDs
export function getProTemplateIds(): string[] {
  return TEMPLATES.filter(t => t.isPro).map(t => t.id);
}

// Get effective colors with custom color theme
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

// Group templates by layout for gallery view
export function getTemplatesByLayout(): Record<string, TemplateConfig[]> {
  const grouped: Record<string, TemplateConfig[]> = {};
  LAYOUTS.forEach(layout => {
    grouped[layout.id] = TEMPLATES.filter(t => t.layout === layout.id);
  });
  return grouped;
}
