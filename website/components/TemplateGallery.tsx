'use client';

import { useState } from 'react';
import { TEMPLATES, TemplateSpec } from '@/lib/template-config';
import styles from './TemplateGallery.module.css';

interface TemplateGalleryProps {
  currentTemplate: string;
  isPro: boolean;
  onSelect: (templateId: string) => void;
  onClose: () => void;
}

// Mini-resume thumbnail component for each template
function TemplateThumbnail({ template, isSelected, isLocked, onClick }: {
  template: TemplateSpec;
  isSelected: boolean;
  isLocked: boolean;
  onClick: () => void;
}) {
  const renderThumbnail = () => {
    const t = template;
    const fontFamily = t.fontFamily === 'serif' ? 'Georgia, serif' : 'Arial, sans-serif';
    const isCentered = t.nameAlignment === 'center';

    // Modern Split - special two-column with photo circle and timeline
    if (t.id === 'modern-split') {
      return (
        <div style={{ display: 'flex', height: '100%', fontFamily }}>
          <div style={{
            width: '35%',
            backgroundColor: '#f5f5f5',
            padding: '6px 4px',
            color: '#333',
            borderRight: `1.5px solid ${t.primaryColor}`,
          }}>
            {/* Photo circle */}
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#ddd', margin: '0 auto 4px', border: `1px solid ${t.primaryColor}` }} />
            <div style={{ fontSize: '3px', color: t.primaryColor, fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', marginTop: '4px' }}>Language</div>
            <div style={{ fontSize: '2.5px' }}>English</div>
            <div style={{ fontSize: '2.5px' }}>Spanish</div>
            <div style={{ fontSize: '3px', color: t.primaryColor, fontWeight: 700, textTransform: 'uppercase', marginBottom: '2px', marginTop: '4px' }}>Skills</div>
            <div style={{ fontSize: '2.5px' }}>Leadership</div>
            <div style={{ fontSize: '2.5px' }}>Strategy</div>
          </div>
          <div style={{ flex: 1, padding: '6px 6px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Georgia, serif' }}>John Smith</div>
            <div style={{ fontSize: '2.5px', color: '#888', marginBottom: '5px' }}>Marketing Professional</div>
            <div style={{ fontSize: '3.5px', color: t.primaryColor, fontWeight: 600, marginBottom: '2px', borderBottom: `0.5px solid ${t.primaryColor}`, paddingBottom: '1px' }}>PROFILE</div>
            <div style={{ fontSize: '2.5px', color: '#555', marginBottom: '4px' }}>Brief bio here...</div>
            <div style={{ fontSize: '3.5px', color: t.primaryColor, fontWeight: 600, marginBottom: '2px', borderBottom: `0.5px solid ${t.primaryColor}`, paddingBottom: '1px' }}>EXPERIENCE</div>
            <div style={{ display: 'flex', gap: '3px' }}>
              <div style={{ fontSize: '2.5px', color: '#888', minWidth: '14px' }}>2022</div>
              <div>
                <div style={{ fontSize: '3px', fontWeight: 600 }}>Software Engineer</div>
                <div style={{ fontSize: '2.5px', color: '#666' }}>Tech Co.</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Clean Classic - centered name, icon contact, accent-only lines
    if (t.id === 'clean-classic') {
      return (
        <div style={{ height: '100%', padding: '6px 8px', fontFamily: 'Arial, sans-serif', backgroundColor: '#fff' }}>
          <div style={{ textAlign: 'center', marginBottom: '1px' }}>
            <div style={{ fontSize: '7px', fontWeight: 700 }}>JOHN SMITH</div>
            <div style={{ fontSize: '2.5px', color: '#888', marginBottom: '3px' }}>Marketing Professional</div>
            <div style={{ fontSize: '2.5px', color: '#555' }}>📍 New York  |  📧 email  |  📱 phone</div>
          </div>
          <div style={{ fontSize: '3.5px', fontWeight: 700, marginTop: '5px', marginBottom: '1px', paddingBottom: '1.5px', borderBottom: `1px solid ${t.primaryColor}` }}>EDUCATION</div>
          <div style={{ fontSize: '3px', fontWeight: 600 }}>B.A. Computer Science</div>
          <div style={{ fontSize: '2.5px', color: '#666' }}>Harvard University • 2022</div>
          <div style={{ fontSize: '3.5px', fontWeight: 700, marginTop: '4px', marginBottom: '1px', paddingBottom: '1.5px', borderBottom: `1px solid ${t.primaryColor}` }}>EXPERIENCE</div>
          <div style={{ fontSize: '3px', fontWeight: 600 }}>Software Engineer</div>
          <div style={{ fontSize: '2.5px', color: '#666' }}>Tech Company • 2022-Present</div>
          <div style={{ fontSize: '2.5px', marginTop: '1px' }}>• Built web apps</div>
        </div>
      );
    }

    // Bold Banner - colored header with bracketed name
    if (t.id === 'bold-banner') {
      return (
        <div style={{ height: '100%', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ backgroundColor: t.headerBg || t.primaryColor, padding: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '5.5px', fontWeight: 700, color: '#fff' }}>[ JOHN SMITH ]</div>
              <div style={{ fontSize: '2.5px', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>Software Engineer</div>
            </div>
          </div>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.05)', padding: '2px 6px', fontSize: '2.5px', color: '#555' }}>email@example.com  |  (555) 123-4567</div>
          <div style={{ padding: '4px 6px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '3.5px', color: t.primaryColor, fontWeight: 700, marginBottom: '2px', borderBottom: `0.5px solid ${t.primaryColor}`, paddingBottom: '1px' }}>OBJECTIVE</div>
            <div style={{ fontSize: '2.5px', color: '#555', marginBottom: '3px' }}>Seeking a role...</div>
            <div style={{ fontSize: '3.5px', color: t.primaryColor, fontWeight: 700, marginBottom: '2px', borderBottom: `0.5px solid ${t.primaryColor}`, paddingBottom: '1px' }}>EXPERIENCE</div>
            <div style={{ fontSize: '3px', fontWeight: 600 }}>Software Engineer</div>
            <div style={{ fontSize: '2.5px', color: '#666' }}>Tech Company</div>
          </div>
        </div>
      );
    }

    // Two-column layout (generic)
    if (t.layout === 'twocolumn') {
      return (
        <div style={{ display: 'flex', height: '100%', fontFamily }}>
          {/* Sidebar */}
          <div style={{
            width: '35%',
            backgroundColor: t.sidebarBg || '#f5f5f5',
            padding: '6px 4px',
            color: '#333',
          }}>
            <div style={{ fontSize: '5px', fontWeight: 700, marginBottom: '4px' }}>John</div>
            <div style={{ fontSize: '5px', fontWeight: 700, marginBottom: '6px' }}>Smith</div>
            <div style={{ fontSize: '3px', color: t.primaryColor, fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px', borderBottom: `0.5px solid ${t.primaryColor}`, paddingBottom: '1px' }}>Contact</div>
            <div style={{ fontSize: '2.5px', marginBottom: '4px' }}>email@example.com</div>
            <div style={{ fontSize: '3px', color: t.primaryColor, fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px', borderBottom: `0.5px solid ${t.primaryColor}`, paddingBottom: '1px' }}>Skills</div>
            <div style={{ fontSize: '2.5px' }}>JavaScript</div>
            <div style={{ fontSize: '2.5px' }}>React</div>
          </div>
          {/* Main content */}
          <div style={{ flex: 1, padding: '6px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '3.5px', color: t.primaryColor, fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px', borderBottom: `1px solid ${t.primaryColor}`, paddingBottom: '1px' }}>Experience</div>
            <div style={{ fontSize: '3px', fontWeight: 600 }}>Software Engineer</div>
            <div style={{ fontSize: '2.5px', color: '#666' }}>Tech Company</div>
          </div>
        </div>
      );
    }

    // Header layout (bold header bar)
    if (t.layout === 'header') {
      return (
        <div style={{ height: '100%', fontFamily }}>
          {/* Header bar */}
          <div style={{
            backgroundColor: t.headerBg || t.primaryColor,
            padding: '8px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '7px', fontWeight: 700, color: '#fff' }}>John Smith</div>
            <div style={{ fontSize: '3px', color: 'rgba(255,255,255,0.8)' }}>email@example.com | (555) 123-4567</div>
          </div>
          {/* Body */}
          <div style={{ padding: '6px 8px', backgroundColor: '#fff' }}>
            <div style={{ fontSize: '4px', color: t.primaryColor, fontWeight: 600, marginBottom: '3px', borderBottom: `1px solid ${t.primaryColor}`, paddingBottom: '1px' }}>EXPERIENCE</div>
            <div style={{ fontSize: '3.5px', fontWeight: 600 }}>Software Engineer</div>
            <div style={{ fontSize: '3px', color: '#666' }}>Tech Company | 2022-Present</div>
          </div>
        </div>
      );
    }

    // Single column layouts - differentiate by style
    const nameSize = t.nameFontSize > 20 ? '8px' : t.nameFontSize > 16 ? '7px' : '6px';
    const isThickLine = t.sectionHeaderStyle === 'caps-thick-underline';
    const hasUnderline = ['caps-underline', 'caps-thick-underline', 'bold-gray-underline'].includes(t.sectionHeaderStyle);
    const isCapsHeader = ['caps-underline', 'caps-thick-underline', 'minimal'].includes(t.sectionHeaderStyle);
    const headerColor = t.sectionHeaderStyle === 'colored' ? t.primaryColor : t.sectionHeaderStyle === 'minimal' ? '#999' : '#000';

    return (
      <div style={{
        height: '100%',
        padding: t.margins > 0.8 ? '8px 10px' : t.margins > 0.6 ? '6px 8px' : '4px 6px',
        fontFamily,
        backgroundColor: '#fff',
      }}>
        {/* Name */}
        <div style={{
          textAlign: isCentered ? 'center' : 'left',
          marginBottom: '2px',
        }}>
          {/* Accent bar for Creative template */}
          {t.hasAccentBar && (
            <div style={{
              display: 'inline-block',
              width: '2px',
              height: '10px',
              backgroundColor: t.primaryColor,
              marginRight: '3px',
              verticalAlign: 'middle',
            }} />
          )}
          <span style={{
            fontSize: nameSize,
            fontWeight: t.nameFontWeight,
            color: t.primaryColor === '#000000' ? '#000' : t.primaryColor,
            letterSpacing: t.sectionHeaderStyle === 'minimal' ? '0.5px' : '0',
          }}>
            John Smith
          </span>
        </div>

        {/* Contact */}
        <div style={{
          fontSize: '3px',
          color: '#666',
          textAlign: isCentered ? 'center' : 'left',
          marginBottom: t.contactDivider ? '3px' : '4px',
          paddingBottom: t.contactDivider ? '3px' : '0',
          borderBottom: t.contactDivider ? '0.5px solid #000' : 'none',
        }}>
          {t.contactLayout === 'icons' ? (
            <span>📧 email | 📱 phone | 📍 city</span>
          ) : (
            <span>email@example.com | (555) 123-4567</span>
          )}
        </div>

        {/* Section header */}
        <div style={{
          fontSize: '4px',
          fontWeight: t.sectionHeaderStyle === 'minimal' ? 400 : 700,
          color: headerColor,
          textTransform: isCapsHeader ? 'uppercase' : 'none',
          letterSpacing: t.sectionHeaderStyle === 'minimal' ? '1px' : '0.3px',
          marginBottom: '2px',
          marginTop: '4px',
          textAlign: t.sectionHeaderStyle === 'small-caps-center' ? 'center' : 'left',
          borderBottom: hasUnderline ? `${isThickLine ? '1.5px' : '0.5px'} solid ${t.sectionHeaderStyle === 'bold-gray-underline' ? '#999' : '#000'}` : 'none',
          paddingBottom: hasUnderline ? '1px' : '0',
        }}>
          {t.educationFirst ? 'Education' : 'Experience'}
        </div>

        {/* Entry */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '3.5px', fontWeight: 600 }}>
            {t.educationFirst ? 'Harvard University' : 'Software Engineer'}
          </span>
          <span style={{ fontSize: '3px', color: '#666' }}>2022</span>
        </div>
        <div style={{ fontSize: '3px', color: '#666' }}>
          {t.educationFirst ? 'B.A. Computer Science' : 'Tech Company'}
        </div>
        {!t.educationFirst && (
          <div style={{ fontSize: '2.5px', marginTop: '1px' }}>
            {t.useDashBullets ? '- Built web apps' : '• Built web apps'}
          </div>
        )}
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
      <div className={styles.templateInfo}>
        <div className={styles.templateName}>{template.name}</div>
        {template.isAtsFriendly && (
          <div className={styles.atsBadge}>ATS-Friendly ✓</div>
        )}
        {template.isCreative && (
          <div className={styles.creativeBadge}>Best for creative roles</div>
        )}
      </div>
    </button>
  );
}

export default function TemplateGallery({ currentTemplate, isPro, onSelect, onClose }: TemplateGalleryProps) {
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

        {!isPro && (
          <div className={styles.proHint}>
            <span className={styles.sparkle}>✨</span>
            <span>Upgrade to Pro to unlock all premium templates</span>
          </div>
        )}

        <div className={styles.grid}>
          {TEMPLATES.map(template => (
            <TemplateThumbnail
              key={template.id}
              template={template}
              isSelected={currentTemplate === template.id}
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
