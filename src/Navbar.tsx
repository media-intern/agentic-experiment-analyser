import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logo from './assets/logo.png';

const navLinks = [
  { to: '/setup', label: 'Setup' },
  { to: '/upload', label: 'Upload' },
  { to: '/results', label: 'Results' },
  { to: '/deep-dive', label: 'Deep Dive' },
  { to: '/dashboard', label: 'Dashboard' },
];

const LOCAL_STORAGE_KEY = 'deepDiveResults';

const Navbar = () => {
  const navigate = useNavigate();

  const handleNewExperiment = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    navigate('/upload');
  };

  return (
    <nav className="w-full bg-white shadow fixed top-0 left-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <img src={logo} alt="Logo" className="h-10 w-auto mr-2" />
        </div>
        <div className="flex items-center space-x-6">
          {navLinks.map((link) =>
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-lg font-medium px-2 py-1 rounded transition-colors duration-200 ${
                  isActive
                    ? 'text-indigo-700 bg-indigo-100'
                    : 'text-gray-700 hover:text-indigo-700 hover:bg-indigo-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          )}
          <button
            onClick={handleNewExperiment}
            className="ml-4 px-4 py-2 rounded-lg bg-indigo-700 text-white font-bold shadow hover:bg-indigo-800 transition"
          >
            Analyse New Experiment
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 