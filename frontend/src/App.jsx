import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';
import RoleRoute from './components/common/RoleRoute';

// Pages
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import FreelancerDashboardPage from './pages/FreelancerDashboardPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import MarketplacePage from './pages/MarketplacePage';
import AssessmentPage from './pages/AssessmentPage';
import ProjectManagementPage from './pages/ProjectManagementPage';
import CommunicationProfilePage from './pages/CommunicationProfilePage';

function AppRoutes() {
  const { currentPath, navigate } = useRouter();

  let pageContent;

  switch (currentPath) {
    case '/':
      pageContent = <HomePage />;
      break;

    case '/auth':
      pageContent = <AuthPage />;
      break;

    case '/marketplace':
      pageContent = <MarketplacePage />;
      break;

    case '/freelancer/dashboard':
      pageContent = (
        <RoleRoute allowedRole="FREELANCER">
          <FreelancerDashboardPage />
        </RoleRoute>
      );
      break;

    case '/customer/dashboard':
      pageContent = (
        <RoleRoute allowedRole="CUSTOMER">
          <CustomerDashboardPage />
        </RoleRoute>
      );
      break;

    case '/projects/manage':
      pageContent = (
        <ProtectedRoute>
          <ProjectManagementPage />
        </ProtectedRoute>
      );
      break;

    case '/assessment':
      pageContent = (
        <RoleRoute allowedRole="FREELANCER">
          <AssessmentPage />
        </RoleRoute>
      );
      break;

    case '/account':
    case '/profile':
      pageContent = (
        <ProtectedRoute>
          <CommunicationProfilePage />
        </ProtectedRoute>
      );
      break;

    default:
      pageContent = (
        <div style={{ padding: 'var(--space-3xl) 0', textAlign: 'center' }}>
          <div className="content-wrapper">
            <h2 style={{ fontSize: '3rem', marginBottom: 'var(--space-sm)' }}>404</h2>
            <p style={{ marginBottom: 'var(--space-lg)' }}>The page you requested could not be located.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/')}
            >
              Return to Homepage
            </button>
          </div>
        </div>
      );
      break;
  }

  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">{pageContent}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppRoutes />
      </RouterProvider>
    </AuthProvider>
  );
}
