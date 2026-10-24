import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import Loader from './Loader';

export default function RoleRoute({ allowedRole, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const { navigate } = useRouter();

  if (loading) {
    return <Loader message="Validating account permissions..." fullScreen />;
  }

  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  if (user?.role !== allowedRole) {
    // Redirect to the appropriate dashboard for their actual role
    if (user?.role === 'CUSTOMER') {
      navigate('/customer/dashboard');
    } else {
      navigate('/freelancer/dashboard');
    }
    return null;
  }

  return children;
}
