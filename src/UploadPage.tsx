import React, { useRef, useState } from 'react';
import { sendRequestJson } from './lib/api';
import { useAnalysisContext } from './contexts/AnalysisContext';
import { useNavigate } from 'react-router-dom';

const UploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { setRequestJson, setSystem, setResults } = useAnalysisContext();
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files && e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setRequestJson(json);
        //setSystem('BSS');
      } catch (err) {
        setError('Invalid JSON format.');
      }
    };
    reader.readAsText(uploadedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsLoading(true);
    setError(null);
    abortControllerRef.current = new AbortController();
    try {
      const res = await sendRequestJson(file);
      setResults(res);
      navigate('/results');
    } catch (err: any) {
      if (err.name === 'AbortError' || (err.message && err.message.includes('Konom fetch failed'))) {
        // User cancelled or Konom fetch failed due to abort, do not show error
        setError(null);
      } else {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setTimeout(() => {
      setIsLoading(false);
      setError(null);
      setFile(null);
      setRequestJson(null);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xl flex flex-col items-center">
        <h1 className="text-3xl font-bold text-indigo-700 mb-2">Upload Request File</h1>
        <p className="text-gray-500 mb-8 text-center">Upload your .json file to view results.</p>
        <form onSubmit={handleSubmit} className="w-full">
          <div
            className={`border-2 rounded-xl p-4 flex flex-col items-center transition-colors duration-200 cursor-pointer bg-gray-50 hover:bg-indigo-50 w-full mb-8`}
            onClick={() => inputRef.current?.click()}
          >
            <input
              type="file"
              className="hidden"
              ref={inputRef}
              onChange={handleFileChange}
              accept=".json"
            />
            <span className="text-lg font-medium text-gray-700 mb-2">Request JSON File</span>
            {file ? (
              <span className="text-green-600 font-semibold mt-2">{file.name}</span>
            ) : (
              <span className="text-gray-400 mt-2">Drag & drop or click to upload</span>
            )}
          </div>

          {/* Optional system selector */}
          {/* <select value={system} onChange={e => setSystem(e.target.value)} className="mb-4 w-full px-3 py-2 rounded-lg border border-gray-300">
            <option value="BSS">BSS</option>
            <option value="DSP">DSP</option>
          </select> */}

          <button
            type="submit"
            className={`w-full py-3 rounded-xl text-lg font-bold transition-colors duration-200 shadow-md ${
              file && !isLoading
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-400 cursor-not-allowed'
            }`}
            disabled={!file || isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Analyze'}
          </button>
          {isLoading && (
            <button
              type="button"
              className="w-full py-3 rounded-xl text-lg font-bold transition-colors duration-200 shadow-md bg-red-500 text-white hover:bg-red-700 mt-2"
              onClick={handleStop}
            >
              Stop Analysis
            </button>
          )}
        </form>

        {isLoading && (
          <div className="flex flex-col items-center mt-6">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span className="text-indigo-600 font-medium">Processing...</span>
          </div>
        )}

        {error && (
          <div className="mt-4 text-red-600 font-semibold">{String(error)}</div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
