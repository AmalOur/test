import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ isAuthenticated, children }) => {
  if (!isAuthenticated) {
    // Instead of immediately redirecting, you might want to show a loading state
    // or attempt to refresh the token
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;