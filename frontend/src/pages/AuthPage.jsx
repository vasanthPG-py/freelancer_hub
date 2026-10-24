import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { authAPI } from '../services/api';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

export default function AuthPage() {
  const { login, register, isAuthenticated, user, error: authError, clearError } = useAuth();
  const { query, navigate } = useRouter();

  // Mode: 'login' | 'register-customer' | 'register-freelancer'
  const initialTab = query.get('tab') === 'login' ? 'login' :
                     query.get('role') === 'CUSTOMER' ? 'register-customer' : 'register-freelancer';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Registration Form State
  const [regData, setRegData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    password: '',
    password_confirm: '',
  });

  // Password Reset Modal State
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1 = Request, 2 = Confirm
  const [resetTokenData, setResetTokenData] = useState({ uidb64: '', token: '' });
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Sync tab with URL query changes
  useEffect(() => {
    if (query.get('tab') === 'login') {
      setActiveTab('login');
    } else if (query.get('role') === 'CUSTOMER') {
      setActiveTab('register-customer');
    } else if (query.get('role') === 'FREELANCER') {
      setActiveTab('register-freelancer');
    }
  }, [query]);

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'CUSTOMER') {
        navigate('/customer/dashboard');
      } else {
        navigate('/freelancer/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleTabSwitch = (tab) => {
    clearError();
    setFormError('');
    setFormSuccess('');
    setActiveTab(tab);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setLoading(true);

    if (!loginEmail || !loginPassword) {
      setFormError('Please enter both email and password.');
      setLoading(false);
      return;
    }

    try {
      const loggedUser = await login(loginEmail, loginPassword);
      if (loggedUser.role === 'CUSTOMER') {
        navigate('/customer/dashboard');
      } else {
        navigate('/freelancer/dashboard');
      }
    } catch (err) {
      setFormError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e, role) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setLoading(true);

    // Client-side validations
    if (!regData.email || !regData.first_name || !regData.last_name || !regData.password) {
      setFormError('Please complete all required fields.');
      setLoading(false);
      return;
    }

    if (regData.password.length < 8) {
      setFormError('Password must be at least 8 characters in length.');
      setLoading(false);
      return;
    }

    if (regData.password !== regData.password_confirm) {
      setFormError('Password and password confirmation do not match.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        email: regData.email.trim().toLowerCase(),
        first_name: regData.first_name.trim(),
        last_name: regData.last_name.trim(),
        phone_number: regData.phone_number.trim(),
        password: regData.password,
        password_confirm: regData.password_confirm,
        role: role,
      };

      const newUser = await register(payload);
      setFormSuccess(`Registration successful! Welcome to FreelanceHub, ${newUser.first_name}.`);

      if (role === 'CUSTOMER') {
        navigate('/customer/dashboard');
      } else {
        navigate('/freelancer/dashboard');
      }
    } catch (err) {
      setFormError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Handlers
  const handleRequestReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    if (!resetEmail) {
      setResetError('Please enter your account email address.');
      setResetLoading(false);
      return;
    }

    try {
      const res = await authAPI.requestPasswordReset(resetEmail.trim());
      setResetMessage(res.message);
      if (res.uidb64 && res.token) {
        setResetTokenData({ uidb64: res.uidb64, token: res.token });
        setResetStep(2); // In development, proceed directly to stage 2 with tokens populated
      }
    } catch (err) {
      setResetError(err.message || 'Unable to request password reset.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');
    setResetLoading(true);

    if (resetNewPassword.length < 8) {
      setResetError('New password must be at least 8 characters.');
      setResetLoading(false);
      return;
    }

    if (resetNewPassword !== resetNewPasswordConfirm) {
      setResetError('New passwords do not match.');
      setResetLoading(false);
      return;
    }

    try {
      const res = await authAPI.confirmPasswordReset(
        resetTokenData.uidb64,
        resetTokenData.token,
        resetNewPassword,
        resetNewPasswordConfirm
      );
      setResetMessage(res.message);
      setTimeout(() => {
        setResetModalOpen(false);
        setResetStep(1);
        setActiveTab('login');
      }, 2000);
    } catch (err) {
      setResetError(err.data?.errors?.token?.[0] || err.message || 'Password reset failed.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-2xl) 0' }}>
      <div className="content-wrapper" style={{ maxWidth: 540 }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-xs)', background: 'var(--bg-surface)', padding: '6px', borderRadius: 'var(--radius-lg)', marginBottom: 'var(--space-xl)', border: '1px solid var(--border-subtle)' }}>
          <button
            type="button"
            onClick={() => handleTabSwitch('login')}
            className={`btn ${activeTab === 'login' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.45rem', border: 'none' }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register-freelancer')}
            className={`btn ${activeTab === 'register-freelancer' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.45rem', border: 'none' }}
          >
            Freelancer Join
          </button>
          <button
            type="button"
            onClick={() => handleTabSwitch('register-customer')}
            className={`btn ${activeTab === 'register-customer' ? 'btn-accent' : 'btn-outline'}`}
            style={{ fontSize: '0.85rem', padding: '0.45rem', border: 'none' }}
          >
            Customer Hire
          </button>
        </div>

        {/* Global Notifications */}
        {(formError || authError) && (
          <Alert type="error" onClose={() => { setFormError(''); clearError(); }}>
            {formError || authError}
          </Alert>
        )}
        {formSuccess && (
          <Alert type="success" onClose={() => setFormSuccess('')}>
            {formSuccess}
          </Alert>
        )}

        {/* TAB 1: SHARED LOGIN */}
        {activeTab === 'login' && (
          <Card>
            <div className="card-header">
              <div>
                <h2>Welcome Back</h2>
                <p>Sign in to your FreelanceHub account</p>
              </div>
              <Badge variant="primary">JWT Secured</Badge>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="name@company.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />

              <Input
                label="Password"
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-md)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setResetModalOpen(true);
                    setResetStep(1);
                    setResetMessage('');
                    setResetError('');
                  }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--primary-400)', cursor: 'pointer', fontSize: '0.88rem' }}
                >
                  Forgot your password?
                </button>
              </div>

              <Button type="submit" variant="primary" block loading={loading}>
                Sign In to FreelanceHub
              </Button>
            </form>
          </Card>
        )}

        {/* TAB 2: FREELANCER REGISTRATION */}
        {activeTab === 'register-freelancer' && (
          <Card>
            <div className="card-header">
              <div>
                <h2>Apply as a Freelancer</h2>
                <p>Build profile, verify skills via AI, and bid on top projects</p>
              </div>
              <Badge variant="role-freelancer">Freelancer Role</Badge>
            </div>

            <form onSubmit={(e) => handleRegisterSubmit(e, 'FREELANCER')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <Input
                  label="First Name"
                  required
                  placeholder="e.g. Alex"
                  value={regData.first_name}
                  onChange={(e) => setRegData({ ...regData, first_name: e.target.value })}
                />
                <Input
                  label="Last Name"
                  required
                  placeholder="e.g. Rivera"
                  value={regData.last_name}
                  onChange={(e) => setRegData({ ...regData, last_name: e.target.value })}
                />
              </div>

              <Input
                label="Work Email"
                type="email"
                required
                placeholder="alex.engineer@example.com"
                value={regData.email}
                onChange={(e) => setRegData({ ...regData, email: e.target.value })}
              />

              <Input
                label="Phone Number (Optional)"
                type="tel"
                placeholder="+1-555-0199"
                value={regData.phone_number}
                onChange={(e) => setRegData({ ...regData, phone_number: e.target.value })}
              />

              <Input
                label="Password (min 8 characters)"
                type="password"
                required
                placeholder="Create a strong password"
                value={regData.password}
                onChange={(e) => setRegData({ ...regData, password: e.target.value })}
              />

              <Input
                label="Confirm Password"
                type="password"
                required
                placeholder="Re-type password"
                value={regData.password_confirm}
                onChange={(e) => setRegData({ ...regData, password_confirm: e.target.value })}
              />

              <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-md)', fontSize: '0.82rem', color: 'var(--primary-200)' }}>
                ℹ️ <strong>AI Verification Note:</strong> Once registered, you will complete an automated, timed AI skill assessment tailored to your tech stack to earn your "AI-Verified" badge.
              </div>

              <Button type="submit" variant="primary" block loading={loading}>
                Register as Freelancer
              </Button>
            </form>
          </Card>
        )}

        {/* TAB 3: CUSTOMER REGISTRATION */}
        {activeTab === 'register-customer' && (
          <Card>
            <div className="card-header">
              <div>
                <h2>Create Customer Account</h2>
                <p>Post projects, review verified bids, and hire top talent</p>
              </div>
              <Badge variant="role-customer">Customer Role</Badge>
            </div>

            <form onSubmit={(e) => handleRegisterSubmit(e, 'CUSTOMER')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
                <Input
                  label="First Name"
                  required
                  placeholder="e.g. Jordan"
                  value={regData.first_name}
                  onChange={(e) => setRegData({ ...regData, first_name: e.target.value })}
                />
                <Input
                  label="Last Name"
                  required
                  placeholder="e.g. Hayes"
                  value={regData.last_name}
                  onChange={(e) => setRegData({ ...regData, last_name: e.target.value })}
                />
              </div>

              <Input
                label="Business Email"
                type="email"
                required
                placeholder="jordan@company.com"
                value={regData.email}
                onChange={(e) => setRegData({ ...regData, email: e.target.value })}
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+1-555-0188"
                value={regData.phone_number}
                onChange={(e) => setRegData({ ...regData, phone_number: e.target.value })}
              />

              <Input
                label="Password (min 8 characters)"
                type="password"
                required
                placeholder="Create a strong password"
                value={regData.password}
                onChange={(e) => setRegData({ ...regData, password: e.target.value })}
              />

              <Input
                label="Confirm Password"
                type="password"
                required
                placeholder="Re-type password"
                value={regData.password_confirm}
                onChange={(e) => setRegData({ ...regData, password_confirm: e.target.value })}
              />

              <Button type="submit" variant="accent" block loading={loading}>
                Register as Project Client
              </Button>
            </form>
          </Card>
        )}

        {/* Password Reset Modal */}
        <Modal
          isOpen={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          title="Reset Account Password"
        >
          {resetError && <Alert type="error">{resetError}</Alert>}
          {resetMessage && <Alert type="success">{resetMessage}</Alert>}

          {resetStep === 1 ? (
            <form onSubmit={handleRequestReset}>
              <p style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                Enter the email address tied to your FreelanceHub account. A secure reset token will be dispatched.
              </p>
              <Input
                label="Account Email"
                type="email"
                required
                placeholder="your.email@example.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
              <Button type="submit" variant="primary" block loading={resetLoading}>
                Generate Password Reset Link
              </Button>
            </form>
          ) : (
            <form onSubmit={handleConfirmReset}>
              <p style={{ marginBottom: 'var(--space-md)', fontSize: '0.9rem' }}>
                Create a new strong password for your account.
              </p>
              <Input
                label="New Password"
                type="password"
                required
                placeholder="Min 8 characters"
                value={resetNewPassword}
                onChange={(e) => setResetNewPassword(e.target.value)}
              />
              <Input
                label="Confirm New Password"
                type="password"
                required
                placeholder="Confirm password"
                value={resetNewPasswordConfirm}
                onChange={(e) => setResetNewPasswordConfirm(e.target.value)}
              />
              <Button type="submit" variant="primary" block loading={resetLoading}>
                Save New Password & Log In
              </Button>
            </form>
          )}
        </Modal>
      </div>
    </div>
  );
}
