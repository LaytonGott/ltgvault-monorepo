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

  // SINGLE COLUMN - 5 distinct variants based on style properties
  const renderSingleColumn = (s: TemplateStyle) => {
    const nameText = s.nameUppercase ? 'JOHN SMITH' : 'John Smith';
    const fontFamily = isSerif ? 'Georgia, serif' : 'Arial, sans-serif';

    return (
      <div className={styles.miniResume} style={{
        padding: s.pageMargin > 50 ? '8px 10px' : '6px 8px',
        fontFamily
      }}>
        {/* Name - varies by style properties */}
        <div className={styles.miniName} style={{
          color: s.primaryColor,
          fontSize: s.nameSize > 26 ? '8px' : s.nameSize < 24 ? '6px' : '7px',
          fontWeight: s.nameWeight > 500 ? 700 : 400,
          letterSpacing: s.nameLetterSpacing > 1 ? '1px' : s.nameLetterSpacing < 0 ? '-0.5px' : '0',
        }}>
          {nameText}
        </div>

        {/* Name underline */}
        {s.nameUnderline && (
          <div style={{
            height: s.nameUnderlineThickness > 2 ? '2px' : '1px',
            backgroundColor: s.primaryColor,
            width: s.styleId === 'bold' ? '40%' : '100%',
            marginBottom: '3px',
          }} />
        )}

        {/* Contact - with divider based on style */}
        <div className={styles.miniContact} style={{
          color: s.lightText,
          borderBottomWidth: s.headerDivider ? (s.headerDividerThickness > 2 ? '2px' : '1px') : '0',
          borderBottomStyle: 'solid',
          borderBottomColor: s.primaryColor,
          paddingBottom: s.headerDivider ? '3px' : '2px',
          marginBottom: s.headerDivider ? '4px' : '3px',
        }}>
          email@example.com | (555) 123-4567
        </div>

        {/* Section Header - varies by style properties */}
        <div className={styles.miniSection}>
          {s.sectionBackground ? (
            <div className={styles.miniSectionTitle} style={{
              backgroundColor: s.primaryColor,
              color: '#fff',
              padding: '2px 4px',
              margin: '0 -4px',
              fontSize: '4px',
              letterSpacing: '0.3px',
            }}>EXPERIENCE</div>
          ) : s.sectionUnderline ? (
            <div className={styles.miniSectionTitle} style={{
              color: s.primaryColor,
              borderBottomWidth: '0.5px',
              borderBottomStyle: 'solid',
              borderBottomColor: s.secondaryColor,
              paddingBottom: '1px',
              fontSize: '4px',
            }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
          ) : s.sectionDots ? (
            <>
              <div className={styles.miniSectionTitle} style={{
                color: s.primaryColor,
                letterSpacing: s.sectionLetterSpacing > 2 ? '1.5px' : '0.5px',
                fontSize: '4px',
              }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
              <div style={{ fontSize: '3px', color: s.secondaryColor, letterSpacing: '2px', marginBottom: '2px' }}>...</div>
            </>
          ) : s.styleId === 'minimal' ? (
            <div className={styles.miniSectionTitle} style={{
              color: s.lightText,
              fontSize: '3.5px',
              fontWeight: 400,
            }}>Experience</div>
          ) : (
            <div className={styles.miniSectionTitle} style={{
              color: s.primaryColor,
              fontWeight: 700,
              fontSize: '4px',
              letterSpacing: s.sectionLetterSpacing > 1 ? '0.5px' : '0',
            }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
          )}

          <div className={styles.miniEntry}>
            <span className={styles.miniJobTitle} style={{ color: s.textColor }}>Software Developer</span>
            {s.datePosition === 'right' && (
              <span className={styles.miniDate} style={{ color: s.primaryColor }}>2022-Present</span>
            )}
          </div>
          {s.datePosition === 'below' && (
            <div className={styles.miniDate} style={{ color: s.lightText, fontStyle: s.dateItalic ? 'italic' : 'normal', fontSize: '3px' }}>2022-Present</div>
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
                backgroundColor: `${s.primaryColor}20`,
                padding: '1px 3px',
                borderRadius: '2px',
                fontSize: '3px',
                color: s.primaryColor,
              }}>JS</span>
              <span style={{
                backgroundColor: `${s.primaryColor}20`,
                padding: '1px 3px',
                borderRadius: '2px',
                fontSize: '3px',
                color: s.primaryColor,
              }}>React</span>
            </div>
          ) : s.skillsStyle === 'inline' ? (
            <div style={{ fontSize: '3px', color: s.textColor }}>JavaScript - React - Node.js</div>
          ) : s.skillsStyle === 'bullets' ? (
            <div style={{ fontSize: '3px', color: s.textColor }}>- JS - React - Node</div>
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
    const sidebarIsFilled = s.sidebarFilled && !s.sidebarBorderOnly;
    const sidebarIsDark = sidebarIsFilled && s.styleId !== 'classic';
    const sidebarWidthPct = `${s.sidebarWidth}%`;

    return (
      <div className={styles.miniResumeTwoCol} style={{ fontFamily }}>
        {/* Sidebar - different styles */}
        <div className={styles.miniSidebar} style={{
          width: sidebarWidthPct,
          backgroundColor: sidebarIsFilled ? s.sidebarBg : (s.sidebarBorderOnly ? '#fff' : '#fafafa'),
          borderRight: s.sidebarBorderOnly ? `1px solid ${s.primaryColor}` : 'none',
          color: sidebarIsDark ? '#fff' : s.textColor,
        }}>
          <div className={styles.miniSidebarName} style={{
            color: sidebarIsDark ? '#fff' : s.primaryColor,
            textTransform: s.nameUppercase ? 'uppercase' : 'none',
            letterSpacing: s.nameUppercase ? '0.5px' : '0',
          }}>John</div>
          <div className={styles.miniSidebarName} style={{
            color: sidebarIsDark ? '#fff' : s.primaryColor,
            textTransform: s.nameUppercase ? 'uppercase' : 'none',
          }}>Smith</div>

          <div className={styles.miniSidebarSection}>
            <div className={styles.miniSidebarTitle} style={{
              color: sidebarIsDark ? 'rgba(255,255,255,0.7)' : s.primaryColor,
              borderBottom: s.sectionUnderline ? `0.5px solid ${sidebarIsDark ? 'rgba(255,255,255,0.3)' : s.secondaryColor}` : 'none',
              letterSpacing: '0.3px',
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
                  JavaScript
                </div>
                <div className={styles.miniSidebarText} style={{ color: sidebarIsDark ? 'rgba(255,255,255,0.9)' : s.textColor }}>
                  React
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className={styles.miniMain} style={{ padding: '6px' }}>
          {/* Section header style */}
          {s.sectionBackground ? (
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
              borderBottom: s.sectionUnderline ? `1px solid ${s.primaryColor}` : 'none',
              paddingBottom: '1px',
              marginBottom: '3px',
            }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
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
    const headerIsFilled = s.styleId === 'modern' || s.styleId === 'bold';
    const nameText = s.nameUppercase ? 'JOHN SMITH' : 'John Smith';

    return (
      <div className={styles.miniResumeHeader} style={{ fontFamily }}>
        {/* Header - dark or light with border */}
        <div className={styles.miniHeaderBg} style={{
          backgroundColor: headerIsFilled ? s.headerBg : '#f8f8f8',
          borderBottom: !headerIsFilled ? `1.5px solid ${s.primaryColor}` : 'none',
          padding: s.nameSize > 26 ? '8px' : '6px 8px',
        }}>
          <div className={styles.miniHeaderName} style={{
            color: headerIsFilled ? '#fff' : s.primaryColor,
            fontSize: s.nameSize > 26 ? '8px' : s.nameSize < 24 ? '6px' : '7px',
            fontWeight: s.nameWeight > 500 ? 700 : 400,
            letterSpacing: s.nameLetterSpacing > 2 ? '1.5px' : '0.5px',
          }}>{nameText}</div>
          <div className={styles.miniHeaderContact} style={{
            color: headerIsFilled ? 'rgba(255,255,255,0.8)' : s.lightText,
          }}>
            email@example.com | (555) 123-4567
          </div>
        </div>

        {/* Body with section headers */}
        <div className={styles.miniHeaderBody}>
          {s.sectionBackground ? (
            <div className={styles.miniHeaderSectionBar} style={{
              backgroundColor: s.primaryColor,
              color: '#fff',
              marginTop: '2px',
            }}>EXPERIENCE</div>
          ) : s.sectionDots ? (
            <>
              <div style={{
                fontSize: '3.5px',
                color: s.primaryColor,
                letterSpacing: s.sectionLetterSpacing > 2 ? '1px' : '0.5px',
                marginTop: '4px',
                marginBottom: '1px',
              }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
              <div style={{ fontSize: '2.5px', color: s.secondaryColor, letterSpacing: '1.5px', marginBottom: '2px' }}>...</div>
            </>
          ) : s.sectionUnderline ? (
            <div style={{
              fontSize: '3.5px',
              color: s.primaryColor,
              borderBottom: `0.5px solid ${s.secondaryColor}`,
              paddingBottom: '1px',
              marginTop: '4px',
              marginBottom: '2px',
            }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
          ) : (
            <div style={{
              fontSize: '3.5px',
              fontWeight: 700,
              color: s.primaryColor,
              marginTop: '4px',
              marginBottom: '2px',
            }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
          )}

          <div className={styles.miniEntry} style={{ marginTop: '2px' }}>
            <span className={styles.miniJobTitle} style={{ color: s.textColor }}>Software Developer</span>
            <span className={styles.miniDate} style={{ color: s.primaryColor }}>2022-Present</span>
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
    const nameText = s.nameUppercase ? 'JOHN SMITH' : 'John Smith';

    return (
      <div className={styles.miniResumeCompact} style={{ fontFamily }}>
        <div className={styles.miniCompactName} style={{
          color: s.primaryColor,
          fontSize: s.nameSize > 26 ? '6px' : s.nameSize < 24 ? '4.5px' : '5px',
          fontWeight: s.nameWeight > 500 ? 700 : 400,
          letterSpacing: s.nameUppercase ? '0.5px' : '0',
        }}>{nameText}</div>

        <div className={styles.miniCompactContact} style={{
          color: s.lightText,
          borderBottom: s.headerDivider ? `${s.headerDividerThickness > 2 ? '1px' : '0.5px'} solid ${s.primaryColor}` : 'none',
        }}>
          email@example.com | (555) 123-4567
        </div>

        <div className={styles.miniCompactSection}>
          {s.sectionBackground ? (
            <div className={styles.miniCompactLabel} style={{
              backgroundColor: s.primaryColor,
              color: '#fff',
            }}>EXPERIENCE</div>
          ) : s.styleId === 'minimal' ? (
            <div className={styles.miniCompactLabel} style={{
              backgroundColor: 'transparent',
              color: s.lightText,
              fontWeight: 400,
              padding: 0,
            }}>Experience</div>
          ) : s.sectionUnderline ? (
            <div className={styles.miniCompactLabel} style={{
              backgroundColor: 'transparent',
              color: s.primaryColor,
              borderBottom: `0.5px solid ${s.secondaryColor}`,
              padding: '0 0 1px 0',
            }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
          ) : (
            <div className={styles.miniCompactLabel} style={{
              backgroundColor: '#f5f5f5',
              color: s.textColor,
            }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
          )}
          <div className={styles.miniCompactEntry} style={{ color: s.textColor }}>Software Developer - Tech Co.</div>
          <div className={styles.miniCompactDesc} style={{ color: s.lightText }}>Built web apps</div>
        </div>

        <div className={styles.miniCompactSection}>
          {s.sectionBackground ? (
            <div className={styles.miniCompactLabel} style={{ backgroundColor: s.primaryColor, color: '#fff' }}>SKILLS</div>
          ) : s.styleId === 'minimal' ? (
            <div className={styles.miniCompactLabel} style={{ backgroundColor: 'transparent', color: s.lightText, fontWeight: 400, padding: 0 }}>Skills</div>
          ) : (
            <div className={styles.miniCompactLabel} style={{ backgroundColor: '#f5f5f5', color: s.textColor }}>{s.sectionUppercase ? 'SKILLS' : 'Skills'}</div>
          )}
          {s.skillsStyle === 'chips' ? (
            <div className={styles.miniCompactSkills}>
              <span style={{ backgroundColor: `${s.primaryColor}20`, color: s.textColor }}>JS</span>
              <span style={{ backgroundColor: `${s.primaryColor}20`, color: s.textColor }}>React</span>
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
    const firstName = s.nameUppercase ? 'JOHN' : 'John';
    const lastName = s.nameUppercase ? 'SMITH' : 'Smith';

    return (
      <div className={styles.miniResumeSplit} style={{ fontFamily }}>
        {/* Accent bar */}
        <div className={styles.miniSplitBar} style={{
          width: '3px',
          backgroundColor: s.primaryColor,
        }} />

        <div className={styles.miniSplitContent} style={{ paddingLeft: '4px' }}>
          {/* Split name styling */}
          <div className={styles.miniSplitName}>
            <span style={{
              color: s.primaryColor,
              fontWeight: s.nameWeight > 500 ? 700 : 400,
              letterSpacing: s.nameUppercase ? '0.5px' : '0',
            }}>{firstName}</span>
            <span style={{
              color: s.textColor,
              fontWeight: s.nameWeight > 500 ? undefined : 400,
            }}> {lastName}</span>
          </div>

          <div className={styles.miniSplitContact} style={{
            color: s.lightText,
          }}>
            email@example.com
          </div>

          <div className={styles.miniSplitColumns}>
            {/* Left column */}
            <div className={styles.miniSplitLeft}>
              {s.sectionBackground ? (
                <div style={{
                  backgroundColor: s.primaryColor,
                  color: '#fff',
                  fontSize: '3px',
                  padding: '1px 2px',
                  marginBottom: '2px',
                }}>SKILLS</div>
              ) : (
                <div className={styles.miniSectionTitle} style={{
                  color: s.primaryColor,
                  borderBottom: s.sectionUnderline ? `1px solid ${s.primaryColor}` : 'none',
                  fontSize: '3.5px',
                  letterSpacing: s.sectionLetterSpacing > 2 ? '1px' : '0.3px',
                }}>{s.sectionUppercase ? 'SKILLS' : 'Skills'}</div>
              )}

              <div style={{ fontSize: '3px', color: s.textColor }}>- JavaScript</div>
              <div style={{ fontSize: '3px', color: s.textColor }}>- React</div>
            </div>

            {/* Right column */}
            <div className={styles.miniSplitRight}>
              {s.sectionBackground ? (
                <div style={{
                  backgroundColor: s.primaryColor,
                  color: '#fff',
                  fontSize: '3px',
                  padding: '1px 2px',
                  marginBottom: '2px',
                }}>EXPERIENCE</div>
              ) : (
                <div className={styles.miniSectionTitle} style={{
                  color: s.primaryColor,
                  borderBottom: s.sectionUnderline ? `1px solid ${s.primaryColor}` : 'none',
                  fontSize: '3.5px',
                }}>{s.sectionUppercase ? 'EXPERIENCE' : 'Experience'}</div>
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
