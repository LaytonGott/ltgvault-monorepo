import styles from '../app/resume/resume.module.css';

export default function ResumeDashboardSkeleton() {
  return (
    <section className={styles.resumesSection}>
      <div className={styles.titleRow}>
        <div style={{ width: 150, height: 28, background: 'rgba(255,255,255,0.05)', borderRadius: 6 }} />
        <div style={{ width: 130, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} />
      </div>
      <div className={styles.grid}>
        {[1, 2, 3].map(i => (
          <div key={i} className={styles.card} style={{ opacity: 0.5, pointerEvents: 'none' }}>
            <div className={styles.cardPreview} />
            <div className={styles.cardInfo}>
              <div style={{ width: '60%', height: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ width: '40%', height: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 4 }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
