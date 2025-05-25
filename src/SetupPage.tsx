import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SetupPage = () => {
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    metricConfig: null,
    systemDefinition: null,
    deepDiveConfig: null,
  });

  const navigate = useNavigate();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, configType: string) => {
    const file = e.target.files?.[0] || null;
    setFiles((prev) => ({ ...prev, [configType]: file }));
    console.log(`📁 Uploaded ${configType}:`, file?.name);
  };

  const allUploaded = Object.values(files).every((file) => file !== null);

  const uploadFilesToBackend = async () => {
    for (const [key, file] of Object.entries(files)) {
      if (file) {
        const formData = new FormData();
        formData.append("file", file);

        try {
          const response = await fetch("http://localhost:8000/api/upload-config", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Failed to upload ${key}:`, errorText);
          } else {
            console.log(`✅ Successfully uploaded ${key}`);
          }
        } catch (error) {
          console.error(`❌ Error uploading ${key}:`, error);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl">
        <h2 className="text-3xl font-bold text-indigo-700 mb-6">One-Time Setup</h2>

        {/* File Upload Blocks */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Upload Metric Config YAML:</label>
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={(e) => handleFileUpload(e, "metricConfig")}
              className="block w-full text-sm text-gray-700"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Upload System Definition YAML:</label>
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={(e) => handleFileUpload(e, "systemDefinition")}
              className="block w-full text-sm text-gray-700"
            />
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-1">Upload Deep Dive Config YAML:</label>
            <input
              type="file"
              accept=".yaml,.yml"
              onChange={(e) => handleFileUpload(e, "deepDiveConfig")}
              className="block w-full text-sm text-gray-700"
            />
          </div>
        </div>

        {/* Continue Button */}
        <button
          onClick={async () => {
            if (allUploaded) {
              await uploadFilesToBackend();
              console.log("✅ All config files uploaded successfully. Proceeding to /upload...");
              localStorage.setItem("agentic_config_done", "true");
              navigate("/upload");
            } else {
              console.error("⚠️ Please upload all 3 configuration files before continuing.");
            }
          }}
          disabled={!allUploaded}
          className={`w-full py-3 rounded-xl font-semibold transition-colors duration-200 shadow-md text-lg ${
            allUploaded
              ? "bg-indigo-600 text-white hover:bg-indigo-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SetupPage;


// import React, { useState, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { CloudArrowUpIcon, Cog6ToothIcon, TableCellsIcon } from '@heroicons/react/24/outline';

// const configFiles: { key: ConfigKey; label: string; icon: React.ReactNode }[] = [
//   { key: 'config1', label: "System Definition", icon: <Cog6ToothIcon className="h-7 w-7 text-indigo-500" /> },
//   { key: 'config2', label: "Metric Definitions & Formulas", icon: <TableCellsIcon className="h-7 w-7 text-indigo-500" /> },
//   { key: 'config3', label: "Valid Deep Dive Dimensions", icon: <CloudArrowUpIcon className="h-7 w-7 text-indigo-500" /> },
// ];

// type ConfigKey = 'config1' | 'config2' | 'config3';

// type FilesState = {
//   [key in ConfigKey]: File | null;
// };

// type DragActiveState = {
//   [key in ConfigKey]?: boolean;
// };

// const SetupPage = () => {
//   const [files, setFiles] = useState<FilesState>({
//     config1: null,
//     config2: null,
//     config3: null,
//   });
//   const [dragActive, setDragActive] = useState<DragActiveState>({});
//   const inputRefs = useRef<{ [key in ConfigKey]?: HTMLInputElement | null }>({});
//   const navigate = useNavigate();

//   const handleFileChange = (
//     e: React.ChangeEvent<HTMLInputElement>,
//     key: ConfigKey
//   ) => {
//     const file = e.target.files && e.target.files[0];
//     if (file) {
//       setFiles((prev: FilesState) => ({ ...prev, [key]: file }));
//     }
//   };

//   const handleDrop = (
//     e: React.DragEvent<HTMLDivElement>,
//     key: ConfigKey
//   ) => {
//     e.preventDefault();
//     setDragActive((prev: DragActiveState) => ({ ...prev, [key]: false }));
//     const file = e.dataTransfer.files && e.dataTransfer.files[0];
//     if (file) {
//       setFiles((prev: FilesState) => ({ ...prev, [key]: file }));
//     }
//   };

//   const handleDragOver = (
//     e: React.DragEvent<HTMLDivElement>,
//     key: ConfigKey
//   ) => {
//     e.preventDefault();
//     setDragActive((prev: DragActiveState) => ({ ...prev, [key]: true }));
//   };

//   const handleDragLeave = (
//     e: React.DragEvent<HTMLDivElement>,
//     key: ConfigKey
//   ) => {
//     e.preventDefault();
//     setDragActive((prev: DragActiveState) => ({ ...prev, [key]: false }));
//   };

//   const allUploaded = Object.values(files).every(Boolean);

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
//       <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-2xl flex flex-col items-center">
//         <h1 className="text-4xl font-extrabold text-indigo-700 mb-2 text-center">Setup Config Files</h1>
//         <p className="text-gray-500 mb-8 text-center text-lg max-w-2xl">
//           Upload the following configuration files to continue:
//         </p>
//         <div className="grid grid-cols-1 gap-6 w-full mb-8">
//           {configFiles.map(({ key, label, icon }) => (
//             <div
//               key={key}
//               className={`flex items-center gap-4 border-2 rounded-2xl p-5 transition-colors duration-200 cursor-pointer bg-white shadow hover:shadow-lg hover:bg-indigo-50 ${
//                 dragActive[key] ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200'
//               }`}
//               onClick={() => inputRefs.current[key]?.click()}
//               onDrop={e => handleDrop(e, key)}
//               onDragOver={e => handleDragOver(e, key)}
//               onDragLeave={e => handleDragLeave(e, key)}
//             >
//               <input
//                 type="file"
//                 className="hidden"
//                 ref={el => { inputRefs.current[key] = el; }}
//                 onChange={e => handleFileChange(e, key)}
//                 accept=".json,.yaml,.yml,.env,.txt"
//               />
//               <div className="flex-shrink-0">{icon}</div>
//               <div className="flex flex-col flex-1">
//                 <span className="text-lg font-semibold text-gray-800">{label}</span>
//                 {files[key] ? (
//                   <span className="text-green-600 font-medium mt-1">{files[key]?.name}</span>
//                 ) : (
//                   <span className="text-gray-400 mt-1">Drag & drop or click to upload</span>
//                 )}
//               </div>
//             </div>
//           ))}
//         </div>
//         <button
//           className={`w-full py-3 rounded-xl text-xl font-bold transition-colors duration-200 shadow-md mt-2 ${
//             allUploaded
//               ? 'bg-indigo-600 text-white hover:bg-indigo-700'
//               : 'bg-gray-300 text-gray-400 cursor-not-allowed'
//           }`}
//           disabled={!allUploaded}
//           onClick={() => {
//             if (allUploaded) {
//               localStorage.setItem('agentic_config_done', 'true');
//               console.log("All files uploaded successfully. Navigating to /upload...");
//               navigate('/upload');
//             }
//           }}
//    >
//           Continue
//         </button>
//       </div>
//     </div>
//   );
// };

// export default SetupPage;
