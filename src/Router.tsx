import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupPage from './SetupPage';
import UploadPage from './UploadPage';
import ResultsPage from './ResultsPage';
import DeepDivePage from './DeepDivePage';
import DashboardPage from './DashboardPage';
import Navbar from './Navbar';

const Router = () => {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const configDone = localStorage.getItem('agentic_config_done');
    setIsSetupComplete(configDone === 'true');
  }, []);

  if (isSetupComplete === null) return null; // avoid flicker

  return (
    <HashRouter>
      <Navbar />
      <div className="pt-16">
        <Routes>
          {!isSetupComplete && <Route path="/setup" element={<SetupPage />} />}
          {isSetupComplete && <Route path="/upload" element={<UploadPage />} />}
          {isSetupComplete && <Route path="/results" element={<ResultsPage />} />}
          {isSetupComplete && <Route path="/deep-dive" element={<DeepDivePage />} />}
          {isSetupComplete && <Route path="/dashboard" element={<DashboardPage />} />}
          <Route path="*" element={
            isSetupComplete
              ? <Navigate to="/upload" replace />
              : <Navigate to="/setup" replace />
          } />
        </Routes>
      </div>
    </HashRouter>
  );
};

export default Router;

// import React from 'react';
// import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import SetupPage from './SetupPage';
// import UploadPage from './UploadPage';
// import ResultsPage from './ResultsPage';
// import DeepDivePage from './DeepDivePage';
// import DashboardPage from './DashboardPage';
// import Navbar from './Navbar';

// const Router = () => (
//   <BrowserRouter>
//     <Navbar />
//     <div className="pt-16">
//       <Routes>
//         <Route path="/setup" element={<SetupPage />} />
//         <Route path="/upload" element={<UploadPage />} />
//         <Route path="/results" element={<ResultsPage />} />
//         <Route path="/deep-dive" element={<DeepDivePage />} />
//         <Route path="/dashboard" element={<DashboardPage />} />
//         <Route path="*" element={<Navigate to="/setup" replace />} />
//       </Routes>
//     </div>
//   </BrowserRouter>
// );

// export default Router; 