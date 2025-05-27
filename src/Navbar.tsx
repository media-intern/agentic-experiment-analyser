import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import logo from './assets/logo.png';
import { useAuth } from './contexts/AuthContext';

const navLinks = [
  { to: '/setup', label: 'Setup' },
  { to: '/upload', label: 'Upload' },
  { to: '/results', label: 'Results' },
  { to: '/deep-dive', label: 'Deep Dive' },
  { to: '/dashboard', label: 'Dashboard' },
];

const LOCAL_STORAGE_KEY = 'deepDiveResults';

const Navbar: React.FC = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const navigate = useNavigate();

  const handleNewExperiment = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    navigate('/upload');
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white shadow z-10 flex items-center justify-between px-8 py-3">
      <div className="flex items-center space-x-4">
        <Link to="/upload" className="font-bold text-lg text-blue-600">
          Media Deep-Dive Agent
        </Link>
        <Link to="/upload" className="text-gray-700 hover:text-blue-600">Upload</Link>
        <Link to="/results" className="text-gray-700 hover:text-blue-600">Results</Link>
        <Link to="/deep-dive" className="text-gray-700 hover:text-blue-600">Deep Dive</Link>
        <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
      </div>
      <div>
        {user ? (
          <>
            <span className="mr-4 text-gray-700">{user.displayName || user.email}</span>
            <button onClick={logout} className="bg-red-500 text-white px-3 py-1 rounded">Logout</button>
          </>
        ) : (
          <button onClick={signInWithGoogle} className="bg-blue-500 text-white px-3 py-1 rounded">Login with Google</button>
        )}
      </div>
    </nav>
  );
};

export default Navbar; 