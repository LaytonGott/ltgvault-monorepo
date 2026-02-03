// Resume Template Configuration
// 5 Base Layouts × 5 Style Variants = 25 Templates
// Each variant has STRUCTURAL differences, not just colors

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
  // Style identifier
  styleId: string;

  // Colors
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  lightText: string;
  accentColor: string;
  bgColor: string;
  sidebarBg?: string;
  headerBg?: string;

  // Fonts
  headingFont: string;
  bodyFont: string;

  // Name for display
  styleName: string;

  // STRUCTURAL PROPERTIES - these create visual variety

  // Section header style: 'underline' | 'background' | 'bold-only' | 'caps-spaced' | 'minimal' | 'dots'
  sectionStyle: 'underline' | 'background' | 'bold-only' | 'caps-spaced' | 'minimal' | 'dots';

  // Divider style: 'thin-line' | 'thick-line' | 'double-line' | 'dots' | 'none'
  dividerStyle: 'thin-line' | 'thick-line' | 'double-line' | 'dots' | 'none';

  // Name styling: 'standard' | 'large' | 'all-caps' | 'split-color' | 'light'
  nameStyle: 'standard' | 'large' | 'all-caps' | 'split-color' | 'light';

  // Spacing density: 'normal' | 'compact' | 'spacious'
  spacing: 'normal' | 'compact' | 'spacious';

  // Skills display: 'chips' | 'inline' | 'bullets' | 'bars' | 'plain'
  skillsStyle: 'chips' | 'inline' | 'bullets' | 'bars' | 'plain';

  // Date positioning: 'right' | 'inline' | 'below'
  datePosition: 'right' | 'inline' | 'below';

  // Contact style: 'inline' | 'stacked' | 'icons'
  contactStyle: 'inline' | 'stacked' | 'icons';

  // Show color: true = use color throughout, false = minimal/no color
  useColor: boolean;

  // Sidebar style (for two-column): 'filled' | 'bordered' | 'minimal' | 'accent-bar'
  sidebarStyle: 'filled' | 'bordered' | 'minimal' | 'accent-bar';
}

export interface TemplateLayout {
  id: string;
  name: string;
  description: string;
}

// 5 Base Layouts
export const LAYOUTS: TemplateLayout[] = [
  { id: 'single', name: 'Single Column', description: 'Classic vertical flow, professional and clean' },
  { id: 'twocolumn', name: 'Two Column', description: 'Sidebar with contact/skills, main content area' },
  { id: 'header', name: 'Header Focus', description: 'Bold header with name, content below' },
  { id: 'compact', name: 'Compact', description: 'Dense layout, fits more content on one page' },
  { id: 'split', name: 'Modern Split', description: 'Creative asymmetric design with accent bar' },
];

// 5 Style Variants - each with distinct STRUCTURAL differences
export const STYLES: Record<string, TemplateStyle> = {
  // CLASSIC: Serif fonts, thin underlines, traditional, formal
  classic: {
    styleId: 'classic',
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
    styleName: 'Classic',
    // Structural
    sectionStyle: 'underline',
    dividerStyle: 'thin-line',
    nameStyle: 'standard',
    spacing: 'normal',
    skillsStyle: 'inline',
    datePosition: 'right',
    contactStyle: 'inline',
    useColor: false,
    sidebarStyle: 'filled',
  },

  // MODERN: Sans-serif, no lines, bold headers, clean blocks
  modern: {
    styleId: 'modern',
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
    styleName: 'Modern',
    // Structural
    sectionStyle: 'bold-only',
    dividerStyle: 'none',
    nameStyle: 'large',
    spacing: 'normal',
    skillsStyle: 'chips',
    datePosition: 'right',
    contactStyle: 'inline',
    useColor: true,
    sidebarStyle: 'filled',
  },

  // BOLD: Chunky elements, background headers, lots of color, thick dividers
  bold: {
    styleId: 'bold',
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
    styleName: 'Bold',
    // Structural
    sectionStyle: 'background',
    dividerStyle: 'thick-line',
    nameStyle: 'large',
    spacing: 'normal',
    skillsStyle: 'chips',
    datePosition: 'inline',
    contactStyle: 'stacked',
    useColor: true,
    sidebarStyle: 'filled',
  },

  // ELEGANT: Refined, subtle gray accents, italic subtitles, spaced caps headers
  elegant: {
    styleId: 'elegant',
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
    styleName: 'Elegant',
    // Structural
    sectionStyle: 'dots',
    dividerStyle: 'thin-line',
    nameStyle: 'all-caps',
    spacing: 'spacious',
    skillsStyle: 'plain',
    datePosition: 'below',
    contactStyle: 'stacked',
    useColor: false,
    sidebarStyle: 'bordered',
  },

  // MINIMAL: Maximum whitespace, no color, thin typography, no dividers
  minimal: {
    styleId: 'minimal',
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
    styleName: 'Minimal',
    // Structural
    sectionStyle: 'minimal',
    dividerStyle: 'none',
    nameStyle: 'light',
    spacing: 'spacious',
    skillsStyle: 'plain',
    datePosition: 'right',
    contactStyle: 'inline',
    useColor: false,
    sidebarStyle: 'minimal',
  },
};

// Generate all 25 template combinations
export interface TemplateConfig {
  id: string;
  displayName: string;
  layout: string;
  style: string;
  layoutConfig: TemplateLayout;
  styleConfig: TemplateStyle;
  isPro: boolean;
}

export const TEMPLATES: TemplateConfig[] = [];

// Generate all combinations
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
  // Check for legacy template names
  const mappedId = LEGACY_TEMPLATE_MAP[templateId] || templateId;
  const config = TEMPLATES.find(t => t.id === mappedId);
  // Default to single-classic if not found
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

// Get effective colors for a template with optional custom color theme
export function getEffectiveColors(templateId: string, colorTheme?: string | null): {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarBg: string;
  headerBg: string;
} {
  const config = getTemplateConfig(templateId);
  const style = config.styleConfig;

  // If no custom theme or 'default', use template's colors
  if (!colorTheme || colorTheme === 'default') {
    return {
      primaryColor: style.primaryColor,
      secondaryColor: style.secondaryColor,
      accentColor: style.accentColor,
      sidebarBg: style.sidebarBg || style.primaryColor,
      headerBg: style.headerBg || style.primaryColor,
    };
  }

  // Get custom color
  const theme = COLOR_THEMES[colorTheme as ColorThemeId];
  const customColor = theme?.color || style.primaryColor;

  // Generate lighter variant for secondary
  const lighterColor = customColor + '99'; // Add alpha for lighter look

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
