import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { uploadConfigFile, checkConfigStatus } from "./lib/api";
import { useAuth } from "./contexts/AuthContext";
import { CloudArrowUpIcon, Cog6ToothIcon, TableCellsIcon } from '@heroicons/react/24/outline';

const configFiles = [
  { key: 'metricConfig', label: "Metric Config YAML", icon: <TableCellsIcon className="h-7 w-7 text-indigo-500" /> },
  { key: 'systemDefinition', label: "System Definition YAML", icon: <Cog6ToothIcon className="h-7 w-7 text-indigo-500" /> },
  { key: 'deepDiveConfig', label: "Deep Dive Config YAML", icon: <CloudArrowUpIcon className="h-7 w-7 text-indigo-500" /> },
];

const REQUIRED_FILES = [
  "metric_config.yaml",
  "system_definition.yaml",
  "deep_dive_config.yaml",
];

const SetupPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [uploaded, setUploaded] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [dragOver, setDragOver] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!loading && !user) {
      navigate("/upload");
      return;
    }
    if (user) {
      setChecking(true);
      checkConfigStatus(user.uid)
        .then((res) => {
          if (res.config_complete) {
            navigate("/upload");
          }
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    }
  }, [user, loading, navigate]);

  const handleFileUpload = async (file: File | null, fileType: string) => {
    setError(null);
    if (!file || !user) return;
    try {
      await uploadConfigFile(file, user.uid);
      setUploaded((prev) => ({ ...prev, [fileType]: true }));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading || checking) return <div>Loading...</div>;
  if (!user) return <div>Please log in to set up your config files.</div>;

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
              className={`flex items-center gap-4 border-2 rounded-2xl p-5 transition-colors duration-200 cursor-pointer bg-white shadow hover:shadow-lg hover:bg-indigo-50 border-gray-200 ${dragOver[key] ? 'border-indigo-600 bg-indigo-50' : ''}`}
              onClick={() => inputRefs.current[key]?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(d => ({ ...d, [key]: true })); }}
              onDragLeave={e => { e.preventDefault(); setDragOver(d => ({ ...d, [key]: false })); }}
              onDrop={e => {
                e.preventDefault();
                setDragOver(d => ({ ...d, [key]: false }));
                const file = e.dataTransfer.files[0];
                handleFileUpload(file, key);
              }}
            >
              <input
                type="file"
                className="hidden"
                ref={el => { inputRefs.current[key] = el; }}
                onChange={e => handleFileUpload(e.target.files?.[0] || null, key)}
                accept=".yaml,.yml"
              />
              <div className="flex-shrink-0">{icon}</div>
              <div className="flex flex-col flex-1">
                <span className="text-lg font-semibold text-gray-800">{label}</span>
                {uploaded[key] ? (
                  <span className="text-green-600 font-medium mt-1">Uploaded</span>
                ) : (
                  <span className="text-gray-400 mt-1">Click or drag & drop to upload</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {error && <div className="text-red-600 mt-2">{error}</div>}
        <button
          className={`w-full py-3 rounded-xl text-xl font-bold transition-colors duration-200 shadow-md mt-2 ${
            Object.values(uploaded).every((value) => value)
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-300 text-gray-400 cursor-not-allowed'
          }`}
          disabled={!Object.values(uploaded).every((value) => value)}
          onClick={async () => {
            if (Object.values(uploaded).every((value) => value)) {
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
