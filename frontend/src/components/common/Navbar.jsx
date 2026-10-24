import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter, Link } from '../../context/RouterContext';
import Badge from './Badge';
import Button from './Button';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, isAuthenticated, isCustomer, isFreelancer, logout } = useAuth();
  const { currentPath, navigate } = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    closeMobileMenu();
    await logout();
    navigate('/');
  };

  return (
    <nav className="navbar" role="navigation" aria-label="Main Navigation">
      <div className="content-wrapper">
        <div className="navbar-inner">
          {/* Brand Logo */}
          <Link to="/" className="navbar-brand" onClick={closeMobileMenu}>
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span>Freelance<span style={{ color: 'var(--primary-400)' }}>Hub</span></span>
            <span className="brand-ai-badge">AI Verified</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="nav-links-desktop">
            <Link to="/marketplace" className={`nav-link ${currentPath === '/marketplace' ? 'active' : ''}`}>
              Find Work
            </Link>

            {isAuthenticated ? (
              <>
                {isCustomer && (
                  <>
                    <Link to="/customer/dashboard" className={`nav-link ${currentPath === '/customer/dashboard' ? 'active' : ''}`}>
                      Customer Dashboard
                    </Link>
                    <Link to="/projects/manage" className={`nav-link ${currentPath === '/projects/manage' ? 'active' : ''}`}>
                      Projects & Bids
                    </Link>
                  </>
                )}
                {isFreelancer && (
                  <>
                    <Link to="/freelancer/dashboard" className={`nav-link ${currentPath === '/freelancer/dashboard' ? 'active' : ''}`}>
                      Freelancer Dashboard
                    </Link>
                    <Link to="/projects/manage" className={`nav-link ${currentPath === '/projects/manage' ? 'active' : ''}`}>
                      My Bids & Contracts
                    </Link>
                    <Link to="/assessment" className={`nav-link ${currentPath === '/assessment' ? 'active' : ''}`}>
                      AI Verification
                    </Link>
                  </>
                )}

                <Link to="/account" className={`nav-link ${currentPath === '/account' ? 'active' : ''}`}>
                  Account & Profile
                </Link>

                {/* Notifications */}
                <NotificationBell />

                {/* Authenticated User Status & Menu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginLeft: 'var(--space-xs)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {user?.full_name}
                    </span>
                    <Badge variant={isCustomer ? 'role-customer' : 'role-freelancer'} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                      {user?.role}
                    </Badge>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleLogout}>
                    Sign Out
                  </Button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginLeft: 'var(--space-md)' }}>
                <Button variant="outline" size="sm" onClick={() => navigate('/auth?tab=login')}>
                  Sign In
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/auth?tab=register&role=FREELANCER')}>
                  Join as Talent
                </Button>
                <Button variant="accent" size="sm" onClick={() => navigate('/auth?tab=register&role=CUSTOMER')}>
                  Hire Freelancers
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle (44px target) */}
          <button
            type="button"
            className="mobile-nav-toggle"
            onClick={toggleMobileMenu}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-nav-drawer" role="menu">
          <Link to="/marketplace" className="nav-link" onClick={closeMobileMenu}>
            Find Work
          </Link>
          <Link to="/#how-it-works" className="nav-link" onClick={closeMobileMenu}>
            How It Works
          </Link>

          {isAuthenticated ? (
            <>
              {isCustomer && (
                <>
                  <Link to="/customer/dashboard" className="nav-link" onClick={closeMobileMenu}>
                    Customer Dashboard
                  </Link>
                  <Link to="/projects/manage" className="nav-link" onClick={closeMobileMenu}>
                    Projects & Bids
                  </Link>
                </>
              )}
              {isFreelancer && (
                <>
                  <Link to="/freelancer/dashboard" className="nav-link" onClick={closeMobileMenu}>
                    Freelancer Dashboard
                  </Link>
                  <Link to="/projects/manage" className="nav-link" onClick={closeMobileMenu}>
                    My Bids & Contracts
                  </Link>
                  <Link to="/assessment" className="nav-link" onClick={closeMobileMenu}>
                    AI Skill Verification
                  </Link>
                </>
              )}
              <Link to="/account" className="nav-link" onClick={closeMobileMenu}>
                Account & Profile
              </Link>

              <div style={{ paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{user?.full_name}</span>
                  <Badge variant={isCustomer ? 'role-customer' : 'role-freelancer'}>
                    {user?.role}
                  </Badge>
                </div>
                <Button variant="danger" block size="md" onClick={handleLogout}>
                  Sign Out
                </Button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', paddingTop: 'var(--space-sm)' }}>
              <Button variant="outline" block onClick={() => { closeMobileMenu(); navigate('/auth?tab=login'); }}>
                Sign In
              </Button>
              <Button variant="primary" block onClick={() => { closeMobileMenu(); navigate('/auth?tab=register&role=FREELANCER'); }}>
                Join as Freelancer
              </Button>
              <Button variant="accent" block onClick={() => { closeMobileMenu(); navigate('/auth?tab=register&role=CUSTOMER'); }}>
                Post a Project (Hire)
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
