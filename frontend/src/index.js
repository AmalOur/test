import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import App from './App';
import ChatPage from './ChatPage';
import KBPage from './KBPage';
import Login from './Login';
import Signup from './Signup';
import ProtectedRoute from './ProtectedRoute';

const Root = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get(process.env.REACT_APP_API_BASE_URL + '/api/check_auth', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setIsAuthenticated(response.data.authenticated);
        } catch (error) {
          console.error('Error checking authentication:', error);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login setIsAuthenticated={setIsAuthenticated} />} />
        <Route path="/signup" element={<Signup />} />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <ChatPage handleLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/knowledge-base" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <KBPage handleLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
  document.getElementById('root')
);