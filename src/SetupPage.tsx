import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { CloudArrowUpIcon, Cog6ToothIcon, TableCellsIcon } from '@heroicons/react/24/outline';

const configFiles = [
  { key: 'metricConfig', label: "Metric Config YAML", icon: <TableCellsIcon className="h-7 w-7 text-indigo-500" /> },
  { key: 'systemDefinition', label: "System Definition YAML", icon: <Cog6ToothIcon className="h-7 w-7 text-indigo-500" /> },
  { key: 'deepDiveConfig', label: "Deep Dive Config YAML", icon: <CloudArrowUpIcon className="h-7 w-7 text-indigo-500" /> },
];

const SetupPage = () => {
  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    metricConfig: null,
    systemDefinition: null,
    deepDiveConfig: null,
  });
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-2xl flex flex-col items-center">
        <h1 className="text-4xl font-extrabold text-indigo-700 mb-2 text-center">Setup Config Files</h1>
        <p className="text-gray-500 mb-8 text-center text-lg max-w-2xl">
          Upload the following configuration files to continue:
        </p>
        <div className="grid grid-cols-1 gap-6 w-full mb-8">
          {configFiles.map(({ key, label, icon }) => (
            <div
              key={key}
              className={`flex items-center gap-4 border-2 rounded-2xl p-5 transition-colors duration-200 cursor-pointer bg-white shadow hover:shadow-lg hover:bg-indigo-50 border-gray-200`}
              onClick={() => inputRefs.current[key]?.click()}
            >
              <input
                type="file"
                className="hidden"
                ref={el => { inputRefs.current[key] = el; }}
                onChange={e => handleFileUpload(e, key)}
                accept=".yaml,.yml"
              />
              <div className="flex-shrink-0">{icon}</div>
              <div className="flex flex-col flex-1">
                <span className="text-lg font-semibold text-gray-800">{label}</span>
                {files[key] ? (
                  <span className="text-green-600 font-medium mt-1">{files[key]?.name}</span>
                ) : (
                  <span className="text-gray-400 mt-1">Drag & drop or click to upload</span>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          className={`w-full py-3 rounded-xl text-xl font-bold transition-colors duration-200 shadow-md mt-2 ${
            allUploaded
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-300 text-gray-400 cursor-not-allowed'
          }`}
          disabled={!allUploaded}
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
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SetupPage;
