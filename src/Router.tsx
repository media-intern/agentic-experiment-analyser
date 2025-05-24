import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupPage from './SetupPage';
import UploadPage from './UploadPage';
import ResultsPage from './ResultsPage';
import DeepDivePage from './DeepDivePage';
import DashboardPage from './DashboardPage';
import Navbar from './Navbar';

const Router = () => (
  <BrowserRouter>
    <Navbar />
    <div className="pt-16">
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/deep-dive" element={<DeepDivePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    </div>
  </BrowserRouter>
);

export default Router; 