import Link from 'next/link';
import styles from '../app/resume/resume.module.css';

export default function ResumeLanding() {
  return (
    <>
      {/* Hero Section */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroContent}>
          <h1 id="hero-title" className={styles.heroTitle}>Build your first resume in minutes</h1>
          <p className={styles.heroSubtitle}>AI-powered suggestions. Made for teens & first-time job seekers.</p>
          <Link href="/resume/new" className={styles.heroButton}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create Your Resume
          </Link>
        </div>
        <div className={styles.heroPreview} aria-hidden="true">
          <div className={styles.resumeMockup}>
            <div className={styles.mockupHeader}>
              <div className={styles.mockupName}>Alex Johnson</div>
              <p className={styles.mockupContact}>alexjohnson@email.com &bull; (555) 123-4567 &bull; Portland, OR</p>
            </div>

            <div className={styles.mockupSection}>
              <div className={styles.mockupSectionTitle}>Experience</div>
              <div className={styles.mockupJob}>
                <div className={styles.mockupJobHeader}>
                  <strong>Sales Associate</strong>
                  <span>Target &bull; 2023 - Present</span>
                </div>
                <ul className={styles.mockupBullets}>
                  <li>Exceeded monthly sales targets by 15% through personalized customer recommendations</li>
                  <li>Trained 5 new team members on POS systems and store policies</li>
                  <li>Maintained organized merchandise displays, improving department presentation</li>
                </ul>
              </div>
            </div>

            <div className={styles.mockupSection}>
              <div className={styles.mockupSectionTitle}>Education</div>
              <div className={styles.mockupEducation}>
                <strong>Lincoln High School</strong>
                <span>Expected Graduation: June 2025 &bull; GPA: 3.7</span>
              </div>
            </div>

            <div className={styles.mockupSection}>
              <div className={styles.mockupSectionTitle}>Skills</div>
              <p className={styles.mockupSkills}>Customer Service &bull; Cash Handling &bull; Inventory Management &bull; Microsoft Office &bull; Teamwork &bull; Problem Solving</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features} id="features" aria-labelledby="features-title">
        <h2 id="features-title" className={styles.sectionTitle}>Everything you need to land the job</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
            </div>
            <h3>AI Bullet Points</h3>
            <p>Describe what you did, we make it sound professional. Turn &quot;helped customers&quot; into interview-winning achievements.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
                <path d="M9 21V9"/>
              </svg>
            </div>
            <h3>Multiple Templates</h3>
            <p>Clean, modern designs that actually get interviews. No flashy gimmicks - just what hiring managers want to see.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h3>Cover Letters</h3>
            <p>Generate tailored cover letters for each job application. Just paste the job description and let AI do the rest.</p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <h3>Job Tracker</h3>
            <p>Keep track of everywhere you&apos;ve applied. Never lose track of a follow-up or miss a deadline again.</p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks} id="how-it-works" aria-labelledby="how-it-works-title">
        <h2 id="how-it-works-title" className={styles.sectionTitle}>How it works</h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <div className={styles.stepNumber}>1</div>
            <h3>Fill in your info</h3>
            <p>Add your experience, education, and skills. No experience? No problem - we&apos;ll help you highlight what matters.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>2</div>
            <h3>Let AI enhance it</h3>
            <p>Click a button to transform basic descriptions into powerful bullet points that grab attention.</p>
          </div>
          <div className={styles.step}>
            <div className={styles.stepNumber}>3</div>
            <h3>Download and apply</h3>
            <p>Export your polished resume as a PDF. Start applying to jobs today.</p>
          </div>
        </div>
      </section>

      {/* Pricing Callout */}
      <section className={styles.pricingCallout} id="pricing" aria-labelledby="pricing-title">
        <div className={styles.pricingCard}>
          <div className={styles.pricingBadge}>Lifetime Access</div>
          <div className={styles.pricingMain}>
            <span className={styles.pricingAmount}>$19</span>
            <span className={styles.pricingPeriod}>one-time</span>
          </div>
          <ul className={styles.pricingFeatures}>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              1 resume free forever — no card required
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              5 AI generations free, 100/month with Pro
            </li>
            <li>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Unlimited resumes, templates &amp; cover letters
            </li>
          </ul>
          <Link href="/resume/new" className={styles.pricingButton}>
            Start Free — No Card Required
          </Link>
          <p className={styles.guarantee}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            30-day money-back guarantee. No questions asked.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faqSection} id="faq" aria-labelledby="faq-title">
        <h2 id="faq-title" className={styles.sectionTitle}>Frequently Asked Questions</h2>
        <div className={styles.faqList}>
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>Do I need work experience to use this?</summary>
            <p className={styles.faqAnswer}>Not at all! LTG Vault is built specifically for teens and first-time job seekers. Our AI helps you highlight school projects, volunteer work, and skills — even if you&apos;ve never had a formal job.</p>
          </details>
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>What does lifetime access mean?</summary>
            <p className={styles.faqAnswer}>Pay $19 once and you have Pro access forever. No monthly fees, no subscriptions, no surprises. You get unlimited resumes, all 25 templates, cover letter generator, and 100 AI generations per month — for life.</p>
          </details>
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>Can I download my resume as a PDF?</summary>
            <p className={styles.faqAnswer}>Yes! Every resume you create can be downloaded as a professionally formatted PDF, ready to submit with job applications or print out for career fairs.</p>
          </details>
          <details className={styles.faqItem}>
            <summary className={styles.faqQuestion}>Is my data private?</summary>
            <p className={styles.faqAnswer}>Absolutely. Your resume data is encrypted and stored securely. We never sell your information or share it with third parties. You can delete your data at any time.</p>
          </details>
        </div>
      </section>
    </>
  );
}
