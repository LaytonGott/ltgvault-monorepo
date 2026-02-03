'use client';

import { useState } from 'react';
import { TEMPLATES, LAYOUTS, getTemplatesByLayout, TemplateConfig, TemplateStyle } from '@/lib/template-config';
import styles from './TemplateGallery.module.css';

interface TemplateGalleryProps {
  currentTemplate: string;
  isPro: boolean;
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

function TemplateThumbnail({ template, isSelected, isLocked, onClick }: {
  template: TemplateConfig;
  isSelected: boolean;
  isLocked: boolean;
  onClick: () => void;
}) {
  const s = template.styleConfig;

  // Helper to determine if style uses serif font
  const isSerif = s.headingFont.includes('Times');

  // Render structurally distinct mini-resume thumbnails
  const renderThumbnail = () => {
    switch (template.layout) {
      case 'single':
        return renderSingleColumn(s);
      case 'twocolumn':
        return renderTwoColumn(s);
      case 'header':
        return renderHeader(s);
      case 'compact':
        return renderCompact(s);
      case 'split':
        return renderSplit(s);
      default:
        return null;
    }
  };

  // SINGLE COLUMN - 5 distinct variants
  const renderSingleColumn = (s: TemplateStyle) => {
    const nameText = s.nameStyle === 'all-caps' ? 'JOHN SMITH' : 'John Smith';
    const fontFamily = isSerif ? 'Georgia, serif' : 'Arial, sans-serif';

    return (
      <div className={styles.miniResume} style={{
        padding: s.spacing === 'spacious' ? '8px 10px' : '6px 8px',
        fontFamily
      }}>
        {/* Name - varies by nameStyle */}
        <div className={styles.miniName} style={{
          color: s.useColor ? s.primaryColor : s.textColor,
          fontSize: s.nameStyle === 'large' ? '8px' : s.nameStyle === 'light' ? '7px' : '7px',
          fontWeight: s.nameStyle === 'light' ? 400 : 700,
          letterSpacing: s.nameStyle === 'all-caps' ? '1px' : s.nameStyle === 'light' ? '0.5px' : '0',
        }}>
          {nameText}
        </div>

        {/* Contact - with divider based on style */}
        <div className={styles.miniContact} style={{
          color: s.lightText,
          borderBottomWidth: s.dividerStyle === 'thick-line' ? '2px' : s.dividerStyle === 'thin-line' ? '1px' : '0',
          borderBottomStyle: 'solid',
          borderBottomColor: s.useColor ? s.primaryColor : '#333',
          paddingBottom: s.dividerStyle !== 'none' ? '3px' : '2px',
          marginBottom: s.dividerStyle !== 'none' ? '4px' : '3px',
        }}>
          email@example.com | (555) 123-4567
        </div>

        {/* Section Header - varies dramatically by sectionStyle */}
        <div className={styles.miniSection}>
          {s.sectionStyle === 'background' ? (
            <div className={styles.miniSectionTitle} style={{
              backgroundColor: s.primaryColor,
              color: '#fff',
              padding: '2px 4px',
              margin: '0 -4px',
              fontSize: '4px',
              letterSpacing: '0.3px',
            }}>EXPERIENCE</div>
          ) : s.sectionStyle === 'underline' ? (
            <div className={styles.miniSectionTitle} style={{
              color: s.useColor ? s.primaryColor : s.textColor,
              borderBottomWidth: '0.5px',
              borderBottomStyle: 'solid',
              borderBottomColor: s.secondaryColor,
              paddingBottom: '1px',
              fontSize: '4px',
            }}>EXPERIENCE</div>
          ) : s.sectionStyle === 'caps-spaced' ? (
            <div className={styles.miniSectionTitle} style={{
              color: s.useColor ? s.primaryColor : s.textColor,
              letterSpacing: '1.5px',
              fontSize: '4px',
            }}>E X P E R I E N C E</div>
          ) : s.sectionStyle === 'minimal' ? (
            <div className={styles.miniSectionTitle} style={{
              color: s.lightText,
              fontSize: '3.5px',
              fontWeight: 400,
            }}>Experience</div>
          ) : (
            <div className={styles.miniSectionTitle} style={{
              color: s.useColor ? s.primaryColor : s.textColor,
              fontWeight: 700,
              fontSize: '4px',
            }}>EXPERIENCE</div>
          )}

          {/* Dots decoration for elegant */}
          {s.sectionStyle === 'dots' && (
            <div style={{ fontSize: '3px', color: s.secondaryColor, letterSpacing: '2px', marginBottom: '2px' }}>• • • • •</div>
          )}

          <div className={styles.miniEntry}>
            <span className={styles.miniJobTitle} style={{ color: s.textColor }}>Software Developer</span>
            {s.datePosition === 'right' && (
              <span className={styles.miniDate} style={{ color: s.useColor ? s.primaryColor : s.lightText }}>2022-Present</span>
            )}
          </div>
          {s.datePosition === 'below' && (
            <div className={styles.miniDate} style={{ color: s.lightText, fontStyle: 'italic', fontSize: '3px' }}>2022-Present</div>
          )}
          <div className={styles.miniCompany} style={{
            color: s.lightText,
            fontStyle: s.styleId === 'elegant' ? 'italic' : 'normal',
          }}>
            Tech Company Inc.
            {s.datePosition === 'inline' && ' | 2022-Present'}
          </div>
          <div className={styles.miniDesc} style={{ color: s.textColor }}>Built web apps using React</div>
        </div>

        {/* Skills - varies by skillsStyle */}
        <div className={styles.miniSection} style={{ marginTop: '3px' }}>
          {s.skillsStyle === 'chips' ? (
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              <span style={{
                backgroundColor: s.useColor ? `${s.primaryColor}20` : '#f0f0f0',
                padding: '1px 3px',
                borderRadius: '2px',
                fontSize: '3px',
                color: s.useColor ? s.primaryColor : s.textColor,
              }}>JS</span>
              <span style={{
                backgroundColor: s.useColor ? `${s.primaryColor}20` : '#f0f0f0',
                padding: '1px 3px',
                borderRadius: '2px',
                fontSize: '3px',
                color: s.useColor ? s.primaryColor : s.textColor,
              }}>React</span>
            </div>
          ) : s.skillsStyle === 'inline' ? (
            <div style={{ fontSize: '3px', color: s.textColor }}>JavaScript • React • Node.js</div>
          ) : (
            <div style={{ fontSize: '3px', color: s.textColor }}>JavaScript, React, Node.js</div>
          )}
        </div>
      </div>
    );
  };

  // TWO COLUMN - 5 distinct sidebar variants
  const renderTwoColumn = (s: TemplateStyle) => {
    const fontFamily = isSerif ? 'Georgia, serif' : 'Arial, sans-serif';
    const sidebarIsDark = s.sidebarStyle === 'filled' && s.useColor;
    const sidebarWidth = s.sidebarStyle === 'minimal' ? '28%' : '35%';

    return (
      <div className={styles.miniResumeTwoCol} style={{ fontFamily }}>
        {/* Sidebar - different styles */}
        <div className={styles.miniSidebar} style={{
          width: sidebarWidth,
          backgroundColor: s.sidebarStyle === 'filled' ? (s.useColor ? s.sidebarBg : '#f5f5f5') :
                          s.sidebarStyle === 'bordered' ? '#fff' :
                          s.sidebarStyle === 'minimal' ? '#fafafa' : '#fff',
          borderRight: s.sidebarStyle === 'bordered' ? `1px solid ${s.primaryColor}` :
                       s.sidebarStyle === 'accent-bar' ? `2px solid ${s.primaryColor}` : 'none',
          color: sidebarIsDark ? '#fff' : s.textColor,
        }}>
          <div className={styles.miniSidebarName} style={{
            color: sidebarIsDark ? '#fff' : s.primaryColor,
            textTransform: s.nameStyle === 'all-caps' ? 'uppercase' : 'none',
            letterSpacing: s.nameStyle === 'all-caps' ? '0.5px' : '0',
          }}>John</div>
          <div className={styles.miniSidebarName} style={{
            color: sidebarIsDark ? '#fff' : s.primaryColor,
            textTransform: s.nameStyle === 'all-caps' ? 'uppercase' : 'none',
          }}>Smith</div>

          <div className={styles.miniSidebarSection}>
            <div className={styles.miniSidebarTitle} style={{
              color: sidebarIsDark ? 'rgba(255,255,255,0.7)' : s.primaryColor,
              borderBottom: s.sectionStyle === 'underline' || s.sectionStyle === 'caps-spaced' ?
                `0.5px solid ${sidebarIsDark ? 'rgba(255,255,255,0.3)' : s.secondaryColor}` : 'none',
              letterSpacing: s.sectionStyle === 'caps-spaced' ? '1px' : '0.3px',
            }}>CONTACT</div>
            <div className={styles.miniSidebarText} style={{ color: sidebarIsDark ? 'rgba(255,255,255,0.9)' : s.lightText }}>
              email@example.com
            </div>
          </div>

          <div className={styles.miniSidebarSection}>
            <div className={styles.miniSidebarTitle} style={{
              color: sidebarIsDark ? 'rgba(255,255,255,0.7)' : s.primaryColor,
            }}>SKILLS</div>
            {s.skillsStyle === 'chips' ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px' }}>
                <span style={{
                  backgroundColor: sidebarIsDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb',
                  padding: '1px 2px',
                  borderRadius: '1px',
                  fontSize: '2.5px',
                  color: sidebarIsDark ? '#fff' : s.textColor,
                }}>JS</span>
                <span style={{
                  backgroundColor: sidebarIsDark ? 'rgba(255,255,255,0.15)' : '#e5e7eb',
                  padding: '1px 2px',
                  borderRadius: '1px',
                  fontSize: '2.5px',
                  color: sidebarIsDark ? '#fff' : s.textColor,
                }}>React</span>
              </div>
            ) : (
              <>
                <div className={styles.miniSidebarText} style={{ color: sidebarIsDark ? 'rgba(255,255,255,0.9)' : s.textColor }}>
                  {s.skillsStyle === 'bullets' ? '• JavaScript' : 'JavaScript'}
                </div>
                <div className={styles.miniSidebarText} style={{ color: sidebarIsDark ? 'rgba(255,255,255,0.9)' : s.textColor }}>
                  {s.skillsStyle === 'bullets' ? '• React' : 'React'}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className={styles.miniMain} style={{ padding: '6px' }}>
          {/* Section header style */}
          {s.sectionStyle === 'background' ? (
            <div style={{
              backgroundColor: s.primaryColor,
              color: '#fff',
              padding: '1px 3px',
              margin: '0 -3px 3px',
              fontSize: '3.5px',
            }}>EXPERIENCE</div>
          ) : (
            <div className={styles.miniSectionTitle} style={{
              color: s.primaryColor,
              borderBottom: s.dividerStyle === 'thick-line' ? `1.5px solid ${s.primaryColor}` :
                           s.sectionStyle === 'underline' ? `1px solid ${s.primaryColor}` : 'none',
              paddingBottom: '1px',
              marginBottom: '3px',
            }}>EXPERIENCE</div>
          )}

          <div className={styles.miniEntry}>
            <span className={styles.miniJobTitle} style={{ color: s.textColor }}>Software Developer</span>
          </div>
          <div className={styles.miniCompany} style={{
            color: s.lightText,
            fontStyle: s.styleId === 'elegant' ? 'italic' : 'normal',
          }}>Tech Company | 2022-Present</div>
        </div>
      </div>
    );
  };

  // HEADER FOCUS - 5 distinct header variants
  const renderHeader = (s: TemplateStyle) => {
    const fontFamily = isSerif ? 'Georgia, serif' : 'Arial, sans-serif';
    const headerIsDark = s.useColor;
    const nameText = s.nameStyle === 'all-caps' ? 'JOHN SMITH' : 'John Smith';

    return (
      <div className={styles.miniResumeHeader} style={{ fontFamily }}>
        {/* Header - dark or light with border */}
        <div className={styles.miniHeaderBg} style={{
          backgroundColor: headerIsDark ? s.headerBg : '#f8f8f8',
          borderBottom: !headerIsDark ? `1.5px solid ${s.primaryColor}` : 'none',
          padding: s.nameStyle === 'large' ? '8px' : '6px 8px',
        }}>
          <div className={styles.miniHeaderName} style={{
            color: headerIsDark ? '#fff' : s.primaryColor,
            fontSize: s.nameStyle === 'large' ? '8px' : s.nameStyle === 'light' ? '6px' : '7px',
            fontWeight: s.nameStyle === 'light' ? 400 : 700,
            letterSpacing: s.nameStyle === 'all-caps' ? '1.5px' : '0.5px',
          }}>{nameText}</div>
          <div className={styles.miniHeaderContact} style={{
            color: headerIsDark ? 'rgba(255,255,255,0.8)' : s.lightText,
            flexDirection: s.contactStyle === 'stacked' ? 'column' : 'row',
          }}>
            {s.contactStyle === 'stacked' ? (
              <>
                <div>email@example.com</div>
                <div>(555) 123-4567</div>
              </>
            ) : (
              'email@example.com | (555) 123-4567'
            )}
          </div>
        </div>

        {/* Body with section headers */}
        <div className={styles.miniHeaderBody}>
          {s.sectionStyle === 'background' ? (
            <div className={styles.miniHeaderSectionBar} style={{
              backgroundColor: s.primaryColor,
              color: '#fff',
              marginTop: '2px',
            }}>EXPERIENCE</div>
          ) : s.sectionStyle === 'caps-spaced' ? (
            <div style={{
              fontSize: '3.5px',
              color: s.useColor ? s.primaryColor : s.textColor,
              letterSpacing: '1.5px',
              marginTop: '4px',
              marginBottom: '2px',
            }}>E X P E R I E N C E</div>
          ) : s.sectionStyle === 'underline' ? (
            <div style={{
              fontSize: '3.5px',
              color: s.useColor ? s.primaryColor : s.textColor,
              borderBottom: `0.5px solid ${s.secondaryColor}`,
              paddingBottom: '1px',
              marginTop: '4px',
              marginBottom: '2px',
            }}>EXPERIENCE</div>
          ) : (
            <div style={{
              fontSize: '3.5px',
              fontWeight: 700,
              color: s.useColor ? s.primaryColor : s.textColor,
              marginTop: '4px',
              marginBottom: '2px',
            }}>EXPERIENCE</div>
          )}

          <div className={styles.miniEntry} style={{ marginTop: '2px' }}>
            <span className={styles.miniJobTitle} style={{ color: s.textColor }}>Software Developer</span>
            <span className={styles.miniDate} style={{ color: s.useColor ? s.primaryColor : s.lightText }}>2022-Present</span>
          </div>
          <div className={styles.miniCompany} style={{
            color: s.lightText,
            fontStyle: s.styleId === 'elegant' ? 'italic' : 'normal',
          }}>Tech Company Inc.</div>
        </div>
      </div>
    );
  };

  // COMPACT - 5 dense but distinct variants
  const renderCompact = (s: TemplateStyle) => {
    const fontFamily = isSerif ? 'Georgia, serif' : 'Arial, sans-serif';
    const nameText = s.nameStyle === 'all-caps' ? 'JOHN SMITH' : 'John Smith';

    return (
      <div className={styles.miniResumeCompact} style={{ fontFamily }}>
        <div className={styles.miniCompactName} style={{
          color: s.useColor ? s.primaryColor : s.textColor,
          fontSize: s.nameStyle === 'large' ? '6px' : s.nameStyle === 'light' ? '4.5px' : '5px',
          fontWeight: s.nameStyle === 'light' ? 400 : 700,
          letterSpacing: s.nameStyle === 'all-caps' ? '0.5px' : '0',
        }}>{nameText}</div>

        <div className={styles.miniCompactContact} style={{
          color: s.lightText,
          borderBottom: s.dividerStyle === 'thick-line' ? `1px solid ${s.useColor ? s.primaryColor : '#999'}` :
                       s.dividerStyle === 'thin-line' ? `0.5px solid ${s.useColor ? s.primaryColor : '#999'}` : 'none',
        }}>
          email@example.com | (555) 123-4567
        </div>

        <div className={styles.miniCompactSection}>
          {s.sectionStyle === 'background' ? (
            <div className={styles.miniCompactLabel} style={{
              backgroundColor: s.primaryColor,
              color: '#fff',
            }}>EXPERIENCE</div>
          ) : s.sectionStyle === 'minimal' ? (
            <div className={styles.miniCompactLabel} style={{
              backgroundColor: 'transparent',
              color: s.lightText,
              fontWeight: 400,
              padding: 0,
            }}>Experience</div>
          ) : s.sectionStyle === 'underline' ? (
            <div className={styles.miniCompactLabel} style={{
              backgroundColor: 'transparent',
              color: s.useColor ? s.primaryColor : s.textColor,
              borderBottom: `0.5px solid ${s.secondaryColor}`,
              padding: '0 0 1px 0',
            }}>EXPERIENCE</div>
          ) : (
            <div className={styles.miniCompactLabel} style={{
              backgroundColor: '#f5f5f5',
              color: s.textColor,
            }}>EXPERIENCE</div>
          )}
          <div className={styles.miniCompactEntry} style={{ color: s.textColor }}>Software Developer — Tech Co.</div>
          <div className={styles.miniCompactDesc} style={{ color: s.lightText }}>Built web apps</div>
        </div>

        <div className={styles.miniCompactSection}>
          {s.sectionStyle === 'background' ? (
            <div className={styles.miniCompactLabel} style={{ backgroundColor: s.primaryColor, color: '#fff' }}>SKILLS</div>
          ) : s.sectionStyle === 'minimal' ? (
            <div className={styles.miniCompactLabel} style={{ backgroundColor: 'transparent', color: s.lightText, fontWeight: 400, padding: 0 }}>Skills</div>
          ) : (
            <div className={styles.miniCompactLabel} style={{ backgroundColor: '#f5f5f5', color: s.textColor }}>SKILLS</div>
          )}
          {s.skillsStyle === 'chips' ? (
            <div className={styles.miniCompactSkills}>
              <span style={{ backgroundColor: s.useColor ? `${s.primaryColor}20` : '#f0f0f0', color: s.textColor }}>JS</span>
              <span style={{ backgroundColor: s.useColor ? `${s.primaryColor}20` : '#f0f0f0', color: s.textColor }}>React</span>
            </div>
          ) : (
            <div style={{ fontSize: '2.5px', color: s.textColor }}>JavaScript, React, Node.js</div>
          )}
        </div>
      </div>
    );
  };

  // SPLIT - 5 distinct accent bar variants
  const renderSplit = (s: TemplateStyle) => {
    const fontFamily = isSerif ? 'Georgia, serif' : 'Arial, sans-serif';
    const barWidth = s.dividerStyle === 'thick-line' ? '5px' : s.dividerStyle === 'none' ? '0' : '3px';
    const firstName = s.nameStyle === 'all-caps' ? 'JOHN' : 'John';
    const lastName = s.nameStyle === 'all-caps' ? 'SMITH' : 'Smith';

    return (
      <div className={styles.miniResumeSplit} style={{ fontFamily }}>
        {/* Accent bar - varies by thickness */}
        {s.dividerStyle !== 'none' && (
          <div className={styles.miniSplitBar} style={{
            width: barWidth,
            backgroundColor: s.useColor ? s.primaryColor : '#333',
          }} />
        )}

        <div className={styles.miniSplitContent} style={{ paddingLeft: s.dividerStyle === 'none' ? '6px' : '4px' }}>
          {/* Split name styling */}
          <div className={styles.miniSplitName}>
            <span style={{
              color: s.useColor ? s.primaryColor : s.textColor,
              fontWeight: s.nameStyle === 'light' ? 400 : 700,
              letterSpacing: s.nameStyle === 'all-caps' ? '0.5px' : '0',
            }}>{firstName}</span>
            <span style={{
              color: s.textColor,
              fontWeight: s.nameStyle === 'light' ? 400 : undefined,
            }}> {lastName}</span>
          </div>

          <div className={styles.miniSplitContact} style={{
            color: s.lightText,
            borderBottom: s.dividerStyle === 'thick-line' ? `1px solid ${s.useColor ? s.secondaryColor : '#ccc'}` :
                         s.dividerStyle === 'thin-line' ? `0.5px solid ${s.useColor ? s.secondaryColor : '#ccc'}` : 'none',
            flexDirection: s.contactStyle === 'stacked' ? 'column' : 'row',
          }}>
            email@example.com
          </div>

          <div className={styles.miniSplitColumns}>
            {/* Left column */}
            <div className={styles.miniSplitLeft}>
              {s.sectionStyle === 'background' ? (
                <div style={{
                  backgroundColor: s.primaryColor,
                  color: '#fff',
                  fontSize: '3px',
                  padding: '1px 2px',
                  marginBottom: '2px',
                }}>SKILLS</div>
              ) : (
                <div className={styles.miniSectionTitle} style={{
                  color: s.useColor ? s.primaryColor : s.textColor,
                  borderBottom: s.sectionStyle === 'underline' ? `1px solid ${s.primaryColor}` : 'none',
                  fontSize: '3.5px',
                  letterSpacing: s.sectionStyle === 'caps-spaced' ? '1px' : '0.3px',
                }}>SKILLS</div>
              )}

              {/* Skills with bars or plain */}
              {s.skillsStyle === 'bars' ? (
                <>
                  <div className={styles.miniSplitSkill} style={{
                    borderLeftColor: s.useColor ? s.primaryColor : '#333',
                    borderLeftWidth: '1px',
                    borderLeftStyle: 'solid',
                    paddingLeft: '2px',
                    color: s.textColor,
                  }}>JavaScript</div>
                  <div className={styles.miniSplitSkill} style={{
                    borderLeftColor: s.useColor ? s.primaryColor : '#333',
                    borderLeftWidth: '1px',
                    borderLeftStyle: 'solid',
                    paddingLeft: '2px',
                    color: s.textColor,
                  }}>React</div>
                </>
              ) : s.skillsStyle === 'bullets' ? (
                <>
                  <div style={{ fontSize: '3px', color: s.textColor }}>• JavaScript</div>
                  <div style={{ fontSize: '3px', color: s.textColor }}>• React</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '3px', color: s.textColor }}>JavaScript</div>
                  <div style={{ fontSize: '3px', color: s.textColor }}>React</div>
                </>
              )}
            </div>

            {/* Right column */}
            <div className={styles.miniSplitRight}>
              {s.sectionStyle === 'background' ? (
                <div style={{
                  backgroundColor: s.primaryColor,
                  color: '#fff',
                  fontSize: '3px',
                  padding: '1px 2px',
                  marginBottom: '2px',
                }}>EXPERIENCE</div>
              ) : (
                <div className={styles.miniSectionTitle} style={{
                  color: s.useColor ? s.primaryColor : s.textColor,
                  borderBottom: s.sectionStyle === 'underline' ? `1px solid ${s.primaryColor}` : 'none',
                  fontSize: '3.5px',
                }}>EXPERIENCE</div>
              )}
              <div className={styles.miniJobTitle} style={{ color: s.textColor, fontSize: '4px' }}>Software Developer</div>
              <div className={styles.miniCompany} style={{
                color: s.lightText,
                fontSize: '3px',
                fontStyle: s.styleId === 'elegant' ? 'italic' : 'normal',
              }}>Tech Company</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <button
      className={`${styles.templateCard} ${isSelected ? styles.selected : ''} ${isLocked ? styles.locked : ''}`}
      onClick={onClick}
      disabled={isLocked}
    >
      <div className={styles.thumbnail} style={{ backgroundColor: '#fff' }}>
        {renderThumbnail()}
        {isLocked && (
          <div className={styles.lockOverlay}>
            <span className={styles.lockIcon}>🔒</span>
            <span className={styles.proBadge}>PRO</span>
          </div>
        )}
        {isSelected && (
          <div className={styles.selectedBadge}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
      <div className={styles.templateName}>{template.displayName}</div>
    </button>
  );
}

export default function TemplateGallery({ currentTemplate, isPro, onSelect, onClose }: TemplateGalleryProps) {
  const [selectedLayout, setSelectedLayout] = useState<string | null>(null);
  const templatesByLayout = getTemplatesByLayout();

  const filteredTemplates = selectedLayout
    ? templatesByLayout[selectedLayout]
    : TEMPLATES;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Choose Template</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.filters}>
          <button
            className={`${styles.filterButton} ${selectedLayout === null ? styles.active : ''}`}
            onClick={() => setSelectedLayout(null)}
          >
            All (25)
          </button>
          {LAYOUTS.map(layout => (
            <button
              key={layout.id}
              className={`${styles.filterButton} ${selectedLayout === layout.id ? styles.active : ''}`}
              onClick={() => setSelectedLayout(layout.id)}
            >
              {layout.name}
            </button>
          ))}
        </div>

        {!isPro && (
          <div className={styles.proHint}>
            <span className={styles.sparkle}>✨</span>
            <span>Upgrade to Pro to unlock all 25 premium templates</span>
          </div>
        )}

        <div className={styles.grid}>
          {filteredTemplates.map(template => (
            <TemplateThumbnail
              key={template.id}
              template={template}
              isSelected={currentTemplate === template.id ||
                (template.id === 'single-classic' && (currentTemplate === 'clean' || !currentTemplate))}
              isLocked={!isPro && template.isPro}
              onClick={() => {
                if (!template.isPro || isPro) {
                  onSelect(template.id);
                  onClose();
                }
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
