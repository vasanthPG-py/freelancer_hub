import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import Loader from './Loader';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const { navigate } = useRouter();

  if (loading) {
    return <Loader message="Verifying authentication session..." fullScreen />;
  }

  if (!isAuthenticated) {
    navigate('/auth');
    return null;
  }

  return children;
}
