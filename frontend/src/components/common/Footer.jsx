import React from 'react';
import { Link } from '../../context/RouterContext';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="content-wrapper">
        <div className="footer-inner">
          <div className="footer-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', marginBottom: 'var(--space-sm)' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Freelance<span style={{ color: 'var(--primary-600)' }}>Hub</span>
              </span>
              <span className="brand-ai-badge">AI Verified</span>
            </div>
            <p style={{ fontSize: '0.88rem', lineHeight: 1.6, maxWidth: 320, color: 'var(--text-muted)' }}>
              The next-generation freelance marketplace powered by automated AI skill verification assessments, milestone escrows, and verified credibility.
            </p>
            <div style={{ marginTop: 'var(--space-md)' }}>
              <span className="demo-tag">DEMO ENVIRONMENT</span>
            </div>
          </div>

          <div className="footer-col">
            <h5>For Customers</h5>
            <ul className="footer-links">
              <li><Link to="/auth?tab=register&role=CUSTOMER">Hire Freelancers</Link></li>
              <li><Link to="/marketplace">Explore Talent Directory</Link></li>
              <li><Link to="/customer/dashboard">Manage Projects</Link></li>
              <li><Link to="/#how-it-works">Milestone Protection</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>For Freelancers</h5>
            <ul className="footer-links">
              <li><Link to="/auth?tab=register&role=FREELANCER">Apply as Freelancer</Link></li>
              <li><Link to="/assessment">AI Skill Verification</Link></li>
              <li><Link to="/marketplace">Browse Open Bids</Link></li>
              <li><Link to="/freelancer/dashboard">Earnings & Milestones</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h5>Platform & Trust</h5>
            <ul className="footer-links">
              <li><Link to="/#how-it-works">How It Works</Link></li>
              <li><span style={{ color: 'var(--text-muted)' }}>PostgreSQL & JWT Security</span></li>
              <li><span style={{ color: 'var(--text-muted)' }}>Automated Server Rubrics</span></li>
              <li><span style={{ color: 'var(--text-muted)' }}>Simulated Test Payments</span></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            &copy; {new Date().getFullYear()} FreelanceHub. Built with Django, PostgreSQL, and React. All transactions and demo accounts are simulated.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-md)', fontSize: '0.82rem' }}>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>System Architecture</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
