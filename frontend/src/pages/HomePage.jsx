import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from '../context/RouterContext';

/* ─────────────────────────────────────────────
   Animated Counter Hook
───────────────────────────────────────────── */
function useCountUp(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return count;
}

/* ─────────────────────────────────────────────
   Intersection Observer Hook
───────────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); obs.disconnect(); }
    }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView];
}

/* ─────────────────────────────────────────────
   Stat Card with animated counter
───────────────────────────────────────────── */
function StatCard({ value, suffix, label, icon, color, delay, inView }) {
  const count = useCountUp(value, 1600, inView);
  return (
    <div className="hp-stat-card" style={{ animationDelay: delay, '--stat-color': color }}>
      <div className="hp-stat-icon" style={{ background: color + '18', color }}>
        {icon}
      </div>
      <div className="hp-stat-number" style={{ color }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div className="hp-stat-label">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main HomePage
───────────────────────────────────────────── */
export default function HomePage() {
  const { navigate } = useRouter();
  const [heroSearch, setHeroSearch] = useState('');
  const [statsRef, statsInView] = useInView(0.2);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(heroSearch.trim()
      ? `/marketplace?search=${encodeURIComponent(heroSearch.trim())}`
      : '/marketplace');
  };

  const popularSkills = ['Python', 'React', 'Django', 'Docker', 'PyTorch', 'AWS', 'TypeScript', 'PostgreSQL'];

  const stats = [
    { value: 2400, suffix: '+', label: 'Verified Freelancers', icon: '👨‍💻', color: '#4f46e5' },
    { value: 840,  suffix: '+', label: 'Projects Completed',  icon: '✅', color: '#059669' },
    { value: 98,   suffix: '%', label: 'Client Satisfaction', icon: '⭐', color: '#d97706' },
    { value: 320,  suffix: '+', label: 'Active Projects',     icon: '🚀', color: '#7c3aed' },
  ];

  const categories = [
    { title: 'Full-Stack & Web Dev',     icon: '💻', count: '140+', desc: 'Django, React, Node.js, REST APIs',         color: '#4f46e5' },
    { title: 'AI & Machine Learning',    icon: '🤖', count: '95+',  desc: 'LLMs, PyTorch, RAG, NLP, Embeddings',       color: '#7c3aed' },
    { title: 'Cloud & DevOps',           icon: '☁️', count: '75+',  desc: 'Docker, Kubernetes, AWS, Terraform',         color: '#2563eb' },
    { title: 'Mobile App Development',   icon: '📱', count: '60+',  desc: 'React Native, Flutter, Swift, Kotlin',       color: '#db2777' },
    { title: 'UI/UX & Product Design',   icon: '🎨', count: '50+',  desc: 'Figma, Design Systems, User Testing',        color: '#e11d48' },
    { title: 'Data Engineering & SQL',   icon: '📊', count: '80+',  desc: 'ETL Pipelines, PostgreSQL, BigQuery',        color: '#0891b2' },
  ];

  const featuredProjects = [
    {
      id: 1,
      title: 'Enterprise Analytics Dashboard with Real-Time Metrics',
      company: 'Apex Innovations Inc.',
      budget: '$4,500',
      category: 'Full-Stack Web Dev',
      deadline: '15 Days',
      skills: ['React', 'Django', 'PostgreSQL'],
      proposals: 8,
      accentColor: '#4f46e5',
    },
    {
      id: 2,
      title: 'LLM RAG Pipeline for Technical Documentation Search',
      company: 'Quantum Core Analytics',
      budget: '$5,800',
      category: 'AI & Machine Learning',
      deadline: '20 Days',
      skills: ['Python', 'PyTorch', 'LLMs & RAG'],
      proposals: 12,
      accentColor: '#7c3aed',
    },
    {
      id: 3,
      title: 'Cross-Platform Fleet Tracking Mobile Application',
      company: 'Vanguard Logistics Co.',
      budget: '$3,800',
      category: 'Mobile App Dev',
      deadline: '25 Days',
      skills: ['React Native', 'Docker', 'AWS'],
      proposals: 6,
      accentColor: '#059669',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Lin',
      role: 'Head of Engineering @ Synthetix Labs',
      text: 'FreelanceHub changed how our team hires contractors. Every freelancer passed a server-evaluated AI assessment, saving our technical team dozens of interview hours.',
      avatar: 'SL',
      gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    },
    {
      name: 'Marcus Vance',
      role: 'Senior Full-Stack Engineer',
      text: 'The AI skill verification gave my profile instant credibility. Within 48 hours of passing the assessment, I landed two high-value milestone contracts.',
      avatar: 'MV',
      gradient: 'linear-gradient(135deg, #059669, #0891b2)',
    },
    {
      name: 'Elena Rostova',
      role: 'Founder @ Apex Commerce',
      text: 'Milestone escrow and structured contract management gave us total confidence. Communication with our hired engineer was crisp and straightforward.',
      avatar: 'ER',
      gradient: 'linear-gradient(135deg, #db2777, #d97706)',
    },
  ];

  const howItWorks = {
    customer: [
      { step: '01', title: 'Post Your Project', desc: 'Define scope, budget, tech stack, and milestone dates in minutes.' },
      { step: '02', title: 'Review Verified Bids', desc: 'Compare proposals from AI-assessed freelancers with proven technical depth.' },
      { step: '03', title: 'Hire with Milestone Escrow', desc: 'Lock deliverables with formal contracts, project chat, and scoped milestones.' },
      { step: '04', title: 'Approve & Release', desc: 'Review work, release milestone payouts, and leave verified star ratings.' },
    ],
    freelancer: [
      { step: '01', title: 'Build Your Profile', desc: 'Showcase background, hourly rate, GitHub projects, and resume.' },
      { step: '02', title: 'Pass AI Verification', desc: 'Complete a 30-min server-evaluated technical exam tailored to your skills.' },
      { step: '03', title: 'Win Verified Bids', desc: 'Unlock proposals with a verified badge displayed on all submissions.' },
      { step: '04', title: 'Deliver & Get Paid', desc: 'Submit milestones, collaborate in project chat, build 5-star reputation.' },
    ],
  };

  return (
    <div className="hp-root">

      {/* HERO SECTION */}
      <section className="hp-hero">
        <div className="hp-blob hp-blob-1" aria-hidden="true" />
        <div className="hp-blob hp-blob-2" aria-hidden="true" />
        <div className="hp-blob hp-blob-3" aria-hidden="true" />

        <div className="content-wrapper hp-hero-inner">
          <div className="hp-eyebrow">
            <span className="hp-eyebrow-dot" />
            <span>Live Platform</span>
            <span className="hp-eyebrow-divider">·</span>
            <span>AI Skill Verification & Milestone Contracts</span>
          </div>

          <h1 className="hp-hero-h1">
            Where <span className="hp-gradient-text">Verified Talent</span>{' '}
            Builds{' '}
            <span className="hp-gradient-text-green">Extraordinary Software</span>
          </h1>

          <p className="hp-hero-sub">
            Say goodbye to inflated résumés. Freelancers prove technical depth with server-evaluated
            AI assessments. Customers hire with <strong>verified confidence</strong>.
          </p>

          <form onSubmit={handleSearchSubmit} className="hp-search-bar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="hero-search"
              type="text"
              placeholder="Search by skill: React, Django, PyTorch, Docker…"
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              className="hp-search-input"
              autoComplete="off"
            />
            <button type="submit" className="btn btn-primary hp-search-btn">
              Search Projects
            </button>
          </form>

          <div className="hp-skill-chips">
            <span className="hp-chips-label">Popular:</span>
            {popularSkills.map((sk) => (
              <button
                key={sk}
                type="button"
                className="hp-skill-chip"
                onClick={() => navigate(`/marketplace?search=${encodeURIComponent(sk)}`)}
              >
                {sk}
              </button>
            ))}
          </div>

          <div className="hp-hero-ctas">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/auth?tab=register&role=CUSTOMER')}>
              Post a Project
            </button>
            <button type="button" className="btn btn-accent btn-lg" onClick={() => navigate('/auth?tab=register&role=FREELANCER')}>
              Join as Freelancer
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/marketplace')}>
              Explore Marketplace →
            </button>
          </div>

          <div className="hp-trust-row">
            {[
              { icon: '🔒', text: 'JWT Secured' },
              { icon: '✅', text: 'AI Verified Talent' },
              { icon: '💳', text: 'Milestone Escrow' },
              { icon: '⚡', text: 'PostgreSQL Backed' },
            ].map(({ icon, text }) => (
              <div key={text} className="hp-trust-badge">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="hp-stats-section" ref={statsRef}>
        <div className="content-wrapper">
          <div className="hp-stats-grid">
            {stats.map((s, i) => (
              <StatCard key={s.label} {...s} delay={`${i * 100}ms`} inView={statsInView} />
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="hp-section hp-section-white">
        <div className="content-wrapper">
          <div className="hp-section-header">
            <div className="hp-section-eyebrow">Skill Domains</div>
            <h2 className="hp-section-h2">In-Demand Technical Categories</h2>
            <p className="hp-section-desc">
              Connect with verified specialists in real-world coding, system architecture, and algorithmic design.
            </p>
          </div>
          <div className="hp-categories-grid">
            {categories.map((cat) => (
              <button
                key={cat.title}
                type="button"
                className="hp-cat-card"
                onClick={() => navigate('/marketplace')}
                style={{ '--cat-color': cat.color }}
              >
                <div className="hp-cat-icon-wrap">
                  <span className="hp-cat-icon">{cat.icon}</span>
                </div>
                <div className="hp-cat-body">
                  <div className="hp-cat-title">{cat.title}</div>
                  <div className="hp-cat-desc">{cat.desc}</div>
                </div>
                <div className="hp-cat-footer">
                  <span className="hp-cat-count">{cat.count} Projects</span>
                  <span className="hp-cat-arrow">Explore →</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PROJECTS */}
      <section className="hp-section hp-section-canvas">
        <div className="content-wrapper">
          <div className="hp-section-header hp-section-header-split">
            <div>
              <div className="hp-section-eyebrow">Live Marketplace</div>
              <h2 className="hp-section-h2" style={{ marginBottom: 4 }}>Featured Open Projects</h2>
              <p className="hp-section-desc" style={{ marginBottom: 0 }}>
                Verified projects seeking top engineering talent right now.
              </p>
            </div>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/marketplace')}>
              View All Projects →
            </button>
          </div>
          <div className="hp-projects-grid">
            {featuredProjects.map((proj) => (
              <div key={proj.id} className="hp-proj-card" style={{ '--proj-color': proj.accentColor }}>
                <div className="hp-proj-top-bar" />
                <div className="hp-proj-head">
                  <span className="hp-proj-category" style={{ color: proj.accentColor, background: proj.accentColor + '12', border: `1px solid ${proj.accentColor}30` }}>
                    {proj.category}
                  </span>
                  <span className="hp-proj-budget">{proj.budget}</span>
                </div>
                <h3 className="hp-proj-title">{proj.title}</h3>
                <p className="hp-proj-meta">
                  <strong>{proj.company}</strong> · Deadline: {proj.deadline}
                </p>
                <div className="hp-proj-skills">
                  {proj.skills.map((sk) => (
                    <span key={sk} className="hp-skill-tag">{sk}</span>
                  ))}
                </div>
                <div className="hp-proj-footer">
                  <span className="hp-proj-proposals">{proj.proposals} Proposals</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate('/marketplace')}>
                    Submit Bid
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="hp-section hp-section-white">
        <div className="content-wrapper">
          <div className="hp-section-header">
            <div className="hp-section-eyebrow">Streamlined Workflow</div>
            <h2 className="hp-section-h2">How FreelanceHub Works</h2>
            <p className="hp-section-desc">
              Transparent, verified execution from first proposal to milestone approval.
            </p>
          </div>
          <div className="hp-hiw-grid">
            <div className="hp-hiw-panel hp-hiw-customer">
              <div className="hp-hiw-panel-header">
                <span className="hp-hiw-role-badge hp-hiw-customer-badge">For Clients</span>
                <h3 className="hp-hiw-panel-title">Hire Pre-Vetted Talent</h3>
              </div>
              <div className="hp-hiw-steps">
                {howItWorks.customer.map((item) => (
                  <div key={item.step} className="hp-hiw-step">
                    <div className="hp-hiw-step-num hp-hiw-step-customer">{item.step}</div>
                    <div>
                      <strong className="hp-hiw-step-title">{item.title}</strong>
                      <p className="hp-hiw-step-desc">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-accent hp-hiw-cta" onClick={() => navigate('/auth?tab=register&role=CUSTOMER')}>
                Post a Project →
              </button>
            </div>
            <div className="hp-hiw-panel hp-hiw-freelancer">
              <div className="hp-hiw-panel-header">
                <span className="hp-hiw-role-badge hp-hiw-freelancer-badge">For Freelancers</span>
                <h3 className="hp-hiw-panel-title">Win Work on Your Merits</h3>
              </div>
              <div className="hp-hiw-steps">
                {howItWorks.freelancer.map((item) => (
                  <div key={item.step} className="hp-hiw-step">
                    <div className="hp-hiw-step-num hp-hiw-step-freelancer">{item.step}</div>
                    <div>
                      <strong className="hp-hiw-step-title">{item.title}</strong>
                      <p className="hp-hiw-step-desc">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary hp-hiw-cta" onClick={() => navigate('/auth?tab=register&role=FREELANCER')}>
                Join as Freelancer →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AI VERIFICATION SHOWCASE */}
      <section className="hp-section hp-section-canvas">
        <div className="content-wrapper">
          <div className="hp-ai-showcase">
            <div className="hp-ai-left">
              <div className="hp-section-eyebrow">Patented Skill Verification</div>
              <h2 className="hp-section-h2">AI That Actually Tests Technical Depth</h2>
              <p className="hp-section-desc">
                Unlike platforms where anyone copy-pastes credentials, FreelanceHub evaluates
                each freelancer on tailored algorithmic questions and real-world trade-offs —
                all server-graded.
              </p>
              <ul className="hp-ai-features">
                {[
                  'Server-side grading against technical rubrics & keywords',
                  '30-minute timed countdown with anti-cheat protection',
                  '60%+ passing threshold before marketplace bidding unlocks',
                  'Verified badge displayed on all approved profiles',
                ].map((f) => (
                  <li key={f} className="hp-ai-feature-item">
                    <span className="hp-ai-check">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/auth?tab=register&role=FREELANCER')}>
                Take the Assessment Today
              </button>
            </div>
            <div className="hp-ai-mockup-wrap">
              <div className="hp-ai-mockup">
                <div className="hp-ai-mockup-header">
                  <div className="hp-ai-mockup-dots">
                    <span style={{ background: '#f87171' }} />
                    <span style={{ background: '#fbbf24' }} />
                    <span style={{ background: '#34d399' }} />
                  </div>
                  <span className="hp-ai-mockup-title">FreelanceHub Assessment</span>
                  <span className="hp-ai-timer">⏱ 18:42</span>
                </div>
                <div className="hp-ai-mockup-body">
                  <div className="hp-ai-progress-bar">
                    <div className="hp-ai-progress-fill" style={{ width: '40%' }} />
                  </div>
                  <div className="hp-ai-qmeta">Question 4 of 10 · Full-Stack Assessment</div>
                  <div className="hp-ai-question">
                    Explain the difference between Django{' '}
                    <code>select_related</code> and <code>prefetch_related</code>.
                    How does each optimize SQL queries under the hood?
                  </div>
                  <div className="hp-ai-answer-area">
                    <div className="hp-ai-answer-correct">
                      <span>✓</span>
                      Evaluates JOIN operations vs independent Python cache queries
                    </div>
                    <div className="hp-ai-answer-pending">
                      Real-time keyword matching and semantic comprehension...
                    </div>
                  </div>
                  <div className="hp-ai-score-preview">
                    <div className="hp-ai-score-label">Current Score</div>
                    <div className="hp-ai-score-bar-wrap">
                      <div className="hp-ai-score-bar">
                        <div className="hp-ai-score-fill" style={{ width: '76%' }} />
                      </div>
                      <span className="hp-ai-score-pct">76%</span>
                    </div>
                    <div className="hp-ai-score-note">✓ Passing threshold reached</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="hp-section hp-section-white">
        <div className="content-wrapper">
          <div className="hp-section-header">
            <div className="hp-section-eyebrow">Reputation & Trust</div>
            <h2 className="hp-section-h2">Trusted by High-Growth Tech Teams</h2>
            <p className="hp-section-desc">Real feedback from engineering directors and verified contractors.</p>
          </div>
          <div className="hp-testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={t.name} className="hp-testi-card" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="hp-testi-quote">"</div>
                <p className="hp-testi-text">{t.text}</p>
                <div className="hp-testi-stars">★★★★★</div>
                <div className="hp-testi-author">
                  <div className="hp-testi-avatar" style={{ background: t.gradient }}>{t.avatar}</div>
                  <div>
                    <div className="hp-testi-name">{t.name}</div>
                    <div className="hp-testi-role">{t.role}</div>
                  </div>
                </div>
                <div className="hp-testi-demo-tag">Sample Demo Content</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="hp-final-cta">
        <div className="hp-final-cta-blob" aria-hidden="true" />
        <div className="content-wrapper hp-final-cta-inner">
          <div className="hp-section-eyebrow" style={{ color: '#c7d2fe' }}>Get Started Today</div>
          <h2 className="hp-final-h2">
            Ready to Build with <span className="hp-gradient-text">Verified Talent?</span>
          </h2>
          <p className="hp-final-sub">
            Join forward-thinking companies and top engineers collaborating with confidence and milestone protection.
          </p>
          <div className="hp-final-btns">
            <button type="button" className="btn btn-lg hp-final-btn-primary" onClick={() => navigate('/auth?tab=register&role=CUSTOMER')}>
              Post a Project as Client
            </button>
            <button type="button" className="btn btn-lg hp-final-btn-outline" onClick={() => navigate('/auth?tab=register&role=FREELANCER')}>
              Sign Up as Freelancer
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
