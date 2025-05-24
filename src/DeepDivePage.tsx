import React, { useState, useRef, useEffect } from 'react';
import { useAnalysisContext } from './contexts/AnalysisContext';
import { sendDeepDiveQuery } from './lib/api';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { useNavigate } from 'react-router-dom';

const LOCAL_STORAGE_KEY = 'deepDiveResults';

const DeepDivePage = () => {
  const { requestJson, system } = useAnalysisContext();

  const [dimensions, setDimensions] = useState<string[]>([]);
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNextSelector, setShowNextSelector] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const navigate = useNavigate();

  // Load from localStorage on mount if not present
  useEffect(() => {
    if (!response) {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setResponse(JSON.parse(stored));
      }
    }
  }, []);

  // Save to localStorage when response changes
  useEffect(() => {
    if (response) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(response));
    }
  }, [response]);

  // Clear localStorage and context/state, then navigate to upload
  const handleNewExperiment = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setResponse(null);
    setDimensions([]);
    navigate('/upload');
  };

  const availableDimensions = [
    "Provider Name", "Integration Type", "Device Type (as in HB Reports)", "Data center", "Customer Name", "UID Sent - Incremental", "Cookie Flag", "New Browser Name", 
    "New OS Name", "Country Code", "State"
  ];

  // Preferred metric order (customize as needed)
  const preferredMetricOrder = [
    "Bid Price (HB Rendered Ad)",
    "Profit (HB Rendered Ad)",
    "Bidder Win Rate (1K)",
    "Bidder Rev Rate (10M)",
    "MNET Rev Rate (10M)"
  ];

  // Get the list of dimensions not yet selected
  const getRemainingDimensions = () => availableDimensions.filter(dim => !dimensions.includes(dim));

  // Add a new dimension
  const handleAddDimension = (dim: string) => {
    setDimensions(prev => [...prev, dim]);
    setShowNextSelector(false);
  };

  // Remove a selected dimension
  const handleRemoveDimension = (idx: number) => {
    setDimensions(prev => prev.filter((_, i) => i !== idx));
    setShowNextSelector(false);
  };

  // Show the next selector
  const handleShowNextSelector = () => {
    setShowNextSelector(true);
  };

  const handleSubmit = async () => {
    if (!requestJson || dimensions.length === 0) {
      setError('Please upload a request file and select at least one dimension.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    abortControllerRef.current = new AbortController();
    try {
      const result = await sendDeepDiveQuery({
        request_json: requestJson,
        system,
        dimensions,
      }, abortControllerRef.current.signal);
      setResponse(result);
    } catch (err: any) {
      if (err.name === 'AbortError' || (err.message && err.message.includes('Konom fetch failed'))) {
        setError(null);
      } else {
        setError(err.message || 'Something went wrong');
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
      setResponse(null);
      setDimensions([]);
      setShowNextSelector(false);
    }, 1000);
  };

  const handleDownloadPDF = () => {
    if (reportRef.current) {
      html2pdf()
        .from(reportRef.current)
        .set({
          filename: 'deep_dive_analysis.pdf',
          margin: [0.5, 0.5, 0.5, 0.5],
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        })
        .save();
    }
  };

  useEffect(() => {
    if (!requestJson) {
      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
        navigate('/upload');
      }, 1800);
    }
  }, [requestJson, navigate]);

  // Helper to identify control row index in a segment
  function findControlIndex(metrics: any[]) {
    const controlKeywords = ["control", "ctrl", "default", "def", "0", "-ctrl"];
    function controlScore(token: string) {
      token = token.toLowerCase();
      let score = 0;
      for (const kw of controlKeywords) {
        if (token === kw) score += 100;
        if (kw === '0' && /[:_\-]0$/.test(token)) score += 50;
        if (new RegExp(`(^|[:_\-])${kw}($|[:_\-])`).test(token)) score += 20;
        if (token.includes(kw)) score += 5;
      }
      return score;
    }
    let bestIdx = -1;
    let bestScore = 0;
    metrics.forEach((row, idx) => {
      const token = String(row['Experiment Tokens'] || row['bucket'] || '');
      const score = controlScore(token);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    return bestScore > 0 ? bestIdx : -1;
  }

  // Compute %Change for each metric row in a segment using value and baseline
  function computePercentChangeForSegment(metrics: any[]) {
    return metrics.map((row: any) => {
      const value = parseFloat(row.value);
      const baseline = parseFloat(row.baseline);
      let pct = '-';
      if (!isNaN(value) && !isNaN(baseline) && baseline !== 0) {
        const pctVal = 100 * (value - baseline) / Math.abs(baseline);
        const sign = pctVal >= 0 ? '+' : '';
        pct = `${sign}${pctVal.toFixed(2)}%`;
      }
      return { ...row, '%Change': pct };
    });
  }

  // Compute %Change for all segments after API response
  const processedSegments = response && response.segments
    ? response.segments.map((segment: any) => ({
        ...segment,
        metrics: computePercentChangeForSegment(segment.metrics || [])
      }))
    : [];

  if (!requestJson) return (
    showPopup ? (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white border border-red-300 rounded-xl shadow-lg px-8 py-6 text-center">
          <div className="text-lg font-bold text-red-600 mb-2">Please upload experiment request</div>
          <div className="text-gray-700">You must upload and analyze an experiment before viewing deep dive analysis.</div>
        </div>
        <div className="fixed inset-0 bg-black opacity-30 z-40" />
      </div>
    ) : null
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 flex flex-col items-center justify-center">
      {/* Print CSS for PDF formatting */}
      <style>{`
        @media print {
          .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
          .force-break { page-break-after: always !important; break-after: page !important; }
          .pdf-metrics-table { page-break-inside: avoid !important; break-inside: avoid !important; }
          .no-rounded { border-radius: 0 !important; }
          .no-shadow { box-shadow: none !important; }
          .no-overflow { overflow: visible !important; }
        }
      `}</style>
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-3xl">
        <h2 className="text-2xl font-bold text-indigo-700 mb-4">Deep Dive Analysis</h2>

        {/* Sequential Dimension Selector */}
        <div className="mb-6">
          <p className="text-gray-700 font-medium mb-2">Select up to 3 dimensions (one by one):</p>
          <div className="flex flex-col gap-3">
            {/* Show selected dimensions with remove option */}
            {dimensions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {dimensions.map((dim, idx) => (
                  <span key={dim} className="flex items-center px-3 py-1 rounded-full bg-indigo-600 text-white font-semibold text-sm">
                    {dim}
                    <button
                      className="ml-2 text-red-200 hover:text-red-500 text-xs font-bold"
                      onClick={() => handleRemoveDimension(idx)}
                      aria-label={`Remove ${dim}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Initial selection: show all dimensions as buttons if none selected */}
            {dimensions.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {availableDimensions.map(dim => (
                  <button
                    key={dim}
                    onClick={() => handleAddDimension(dim)}
                    className="px-3 py-1 rounded-full border text-sm font-semibold shadow-sm border-gray-300 text-gray-700 bg-indigo-50 hover:bg-indigo-100"
                  >
                    {dim}
                  </button>
                ))}
              </div>
            )}

            {/* After first selection, show 'Add dimension?' button if less than 3 selected */}
            {dimensions.length > 0 && dimensions.length < 3 && !showNextSelector && getRemainingDimensions().length > 0 && (
              <button
                className="mt-2 px-4 py-2 rounded-lg bg-indigo-100 text-indigo-700 font-semibold hover:bg-indigo-200 transition"
                onClick={handleShowNextSelector}
              >
                Add Dimension
              </button>
            )}

            {/* Show remaining dimensions as buttons for next selection */}
            {showNextSelector && dimensions.length < 3 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {getRemainingDimensions().map(dim => (
                  <button
                    key={dim}
                    onClick={() => handleAddDimension(dim)}
                    className="px-3 py-1 rounded-full border text-sm font-semibold shadow-sm border-gray-300 text-gray-700 bg-indigo-50 hover:bg-indigo-100"
                  >
                    {dim}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={!requestJson || dimensions.length === 0 || isLoading}
          className={`w-full py-3 rounded-xl font-semibold transition-colors duration-200 shadow-md text-lg mt-2 ${
            !requestJson || dimensions.length === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Deep Dive'}
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

        {/* Error */}
        {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}

        {/* Loading */}
        {isLoading && (
          <div className="mt-4 flex items-center gap-2 text-indigo-600">
            <div className="loader border-2 border-t-2 border-indigo-600 rounded-full w-5 h-5 animate-spin" />
            Running segmentation analysis...
          </div>
        )}

        {/* Response Rendering */}
        {response && (
          <>
            <div ref={reportRef} className="mt-8">
              <h3 className="text-xl font-bold text-indigo-700 mb-4">Segment Insights</h3>
              {processedSegments.map((segment: any, index: number) => (
                <div key={index} className="mb-10 avoid-break no-rounded no-shadow no-overflow" data-html2pdf-pagebreak="avoid">
                  <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl mb-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                      <p className="text-lg font-semibold text-indigo-800">{segment.segment}</p>
                    </div>
                    {/* Metrics Table */}
                    <div className="overflow-x-auto">
                      {segment.metrics && segment.metrics.length > 0 ? (
                        <table className="min-w-full border-separate border-spacing-y-2 mb-4 pdf-metrics-table">
                          <thead>
                            <tr className="text-left text-gray-600 text-sm">
                              <th className="px-4 py-2">Metric</th>
                              <th className="px-4 py-2">Value</th>
                              <th className="px-4 py-2">Baseline</th>
                              <th className="px-4 py-2">%Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const allMetricNames: string[] = Array.from(new Set(segment.metrics.map((m: any) => String(m.name))));
                              const sortedMetricNames: string[] = [
                                ...preferredMetricOrder.filter(m => allMetricNames.includes(m)),
                                ...allMetricNames.filter(m => !preferredMetricOrder.includes(m)).sort()
                              ];
                              return (sortedMetricNames as string[]).map((metricName: string) => {
                                const m = segment.metrics.find((x: any) => x.name === metricName);
                                if (!m) return null;
                                return (
                                  <tr key={metricName} className={
                                    m.significance === 'positive' ? 'bg-green-50' : m.significance === 'negative' ? 'bg-red-50' : ''
                                  }>
                                    <td className="px-4 py-2 font-medium text-gray-700">{m.name}</td>
                                    <td className="px-4 py-2">{typeof m.value === 'number' ? m.value.toFixed(2) : String(m.value)}</td>
                                    <td className="px-4 py-2">{typeof m.baseline === 'number' ? m.baseline.toFixed(2) : String(m.baseline)}</td>
                                    <td className="px-4 py-2">{m['%Change'] ? m['%Change'] : '-'}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-gray-500 mb-4">No metrics to display.</div>
                      )}
                    </div>
                  </div>
                  {/* Final Verdict */}
                  {segment.final_verdict && (
                    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-xl mb-4 w-full max-w-2xl">
                      <div className="text-lg font-bold text-green-700 mb-1">Final Verdict</div>
                      <div className="text-gray-800">{segment.final_verdict}</div>
                    </div>
                  )}
                  {/* Scalability Verdict */}
                  {segment.scalability_verdict && segment.scalability_verdict.verdict && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-xl mb-4 w-full max-w-2xl">
                      <div className="text-lg font-bold text-blue-700 mb-1">Scalability Verdict</div>
                      <div className="text-blue-900 font-semibold mb-1">{segment.scalability_verdict.verdict}</div>
                      {segment.scalability_verdict.reasons && segment.scalability_verdict.reasons.length > 0 && (
                        <ul className="list-disc pl-6 text-gray-800 space-y-1">
                          {segment.scalability_verdict.reasons.map((reason: string, idx: number) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {/* Key Insights */}
                  {segment.key_insights && segment.key_insights.length > 0 && (
                    <div className="bg-white rounded-2xl shadow p-6 w-full max-w-2xl mb-4">
                      <h3 className="text-xl font-bold text-indigo-700 mb-2">Key Insights</h3>
                      <ul className="list-disc pl-6 text-gray-700 space-y-1">
                        {segment.key_insights.map((v: string, i: number) => (
                          <li key={i}>{v}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4">
              <button
                className="px-6 py-3 rounded-xl text-lg font-bold transition-colors duration-200 shadow-md bg-blue-600 text-white hover:bg-blue-700"
                onClick={handleDownloadPDF}
              >
                Download Deep Dive PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DeepDivePage;

// import React, { useState } from 'react';
// import { sendDeepDiveQuery } from './lib/api';

// const DeepDivePage = () => {
//   const [dimensions, setDimensions] = useState<string[]>([]);
//   const [response, setResponse] = useState<any>(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [system, setSystem] = useState('BSS');
//   const [requestJson, setRequestJson] = useState<any | null>(null);
//   const [requestFile, setRequestFile] = useState<File | null>(null);

//   const availableDimensions = ['City', 'Device', 'Customer Type', 'Region'];

//   const handleDimensionToggle = (dim: string) => {
//     setDimensions((prev) =>
//       prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
//     );
//   };

//   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const json = JSON.parse(e.target?.result as string);
//         setRequestJson(json);
//         setRequestFile(file);
//       } catch {
//         setError('Invalid JSON file');
//       }
//     };
//     reader.readAsText(file);
//   };

//   const handleSubmit = async () => {
//     if (!requestJson || dimensions.length === 0) {
//       setError('Please upload a request file and select at least one dimension.');
//       return;
//     }

//     setIsLoading(true);
//     setError(null);
//     setResponse(null);

//     try {
//       const result = await sendDeepDiveQuery({
//         request_json: requestJson,
//         system,
//         dimensions,
//       });
//       setResponse(result);
//     } catch (err: any) {
//       setError(err.message || 'Something went wrong');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50 p-8 flex flex-col items-center">
//       <div className="bg-white rounded-xl shadow-md p-6 w-full max-w-3xl">
//         <h2 className="text-2xl font-bold text-indigo-700 mb-4">Deep Dive Analysis</h2>

//         {/* Upload JSON */}
//         <input
//           type="file"
//           accept=".json"
//           onChange={handleFileUpload}
//           className="mb-4 block"
//         />
//         {requestFile && (
//           <p className="text-sm text-green-600 mb-2">Uploaded: {requestFile.name}</p>
//         )}

//         {/* Dimension Select */}
//         <div className="mb-6">
//           <p className="text-gray-700 font-medium mb-2">Select dimensions:</p>
//           <div className="flex flex-wrap gap-2">
//             {availableDimensions.map((dim) => (
//               <button
//                 key={dim}
//                 onClick={() => handleDimensionToggle(dim)}
//                 className={`px-3 py-1 rounded-full border text-sm ${
//                   dimensions.includes(dim)
//                     ? 'bg-indigo-600 text-white border-indigo-600'
//                     : 'border-gray-300 text-gray-700'
//                 }`}
//               >
//                 {dim}
//               </button>
//             ))}
//           </div>
//         </div>

//         {/* Submit Button */}
//         <button
//           onClick={handleSubmit}
//           disabled={!requestJson || dimensions.length === 0 || isLoading}
//           className={`w-full py-3 rounded-lg font-semibold ${
//             !requestJson || dimensions.length === 0
//               ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
//               : 'bg-indigo-600 text-white hover:bg-indigo-700'
//           }`}
//         >
//           {isLoading ? 'Analyzing...' : 'Analyze Deep Dive'}
//         </button>

//         {/* Error */}
//         {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}

//         {/* Loading */}
//         {isLoading && (
//           <div className="mt-4 flex items-center gap-2 text-indigo-600">
//             <div className="loader border-2 border-t-2 border-indigo-600 rounded-full w-5 h-5 animate-spin" />
//             Running segmentation analysis...
//           </div>
//         )}

//         {/* Response */}
//         {response && (
//           <div className="mt-8">
//             <h3 className="text-xl font-bold text-indigo-700 mb-4">Segment Insights</h3>
//             {response.segments.map((segment: any, index: number) => (
//               <div key={index} className="mb-6 p-4 rounded-lg bg-indigo-50 border-l-4 border-indigo-400 shadow">
//                 <p className="text-sm font-semibold text-indigo-800 mb-1">{segment.segment}</p>
//                 <p className="text-gray-700 mb-2">{segment.insight}</p>
//                 <table className="w-full text-sm border border-gray-300 rounded">
//                   <thead>
//                     <tr>
//                       {Object.keys(segment.metrics[0]).map((key) => (
//                         <th key={key} className="border px-2 py-1 font-medium text-left bg-indigo-100">{key}</th>
//                       ))}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {segment.metrics.map((row: any, rowIdx: number) => (
//                       <tr key={rowIdx}>
//                         {Object.values(row).map((val, i) => (
//                           <td key={i} className="border px-2 py-1">
//                             {typeof val === 'number' ? val.toFixed(2) : String(val)}
//                           </td>
//                         ))}
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//               </div>
//             ))}

//             <div className="mt-6 p-4 bg-green-50 border-l-4 border-green-500 rounded">
//               <h4 className="text-green-700 font-semibold mb-2">Overall Commentary</h4>
//               <p className="text-gray-800">{response.overall_commentary}</p>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default DeepDivePage;

// // version 1 

// // import React, { useState, useRef } from 'react';
// // import { sendDeepDiveQuery } from '../frontend/src/lib/api';
// // // @ts-ignore
// // import html2pdf from 'html2pdf.js';

// // const ALL_DIMENSIONS = [
// //   'Age Group',
// //   'Region',
// //   'Device Type',
// //   'User Segment',
// //   'Subscription Plan',
// //   'Acquisition Channel',
// //   'Gender',
// //   'Engagement Level',
// // ];

// // const mockInsights = {
// //   'Age Group': 'Users aged 18-25 showed the highest improvement in recall.',
// //   'Region': 'APAC region had the lowest latency improvement.',
// //   'Device Type': 'Mobile users saw a 10% increase in F1 score.',
// //   'User Segment': 'Returning users had the highest accuracy.',
// //   'Subscription Plan': 'Premium users experienced the largest drop in latency.',
// //   'Acquisition Channel': 'Organic users had the best precision.',
// //   'Gender': 'Female users saw a 5% increase in recall.',
// //   'Engagement Level': 'Highly engaged users had the best overall metrics.',
// // };

// // const DeepDivePage = () => {
// //   const [selected, setSelected] = useState<(keyof typeof mockInsights)[]>([]);
// //   const [isLoading, setIsLoading] = useState(false);
// //   const [error, setError] = useState<string | null>(null);
// //   const [response, setResponse] = useState<any>(null);
// //   const reportRef = useRef<HTMLDivElement>(null);

// //   const available = ALL_DIMENSIONS.filter((d) => !selected.includes(d as keyof typeof mockInsights));

// //   const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
// //     const val = e.target.value as keyof typeof mockInsights;
// //     if (val && !selected.includes(val) && selected.length < 4) {
// //       setSelected((prev) => [...prev, val]);
// //     }
// //     e.target.value = '';
// //   };

// //   const removeDimension = (dim: keyof typeof mockInsights) => {
// //     setSelected((prev) => prev.filter((d) => d !== dim));
// //     setResponse(null);
// //   };

// //   const runAnalysis = async () => {
// //     setIsLoading(true);
// //     setError(null);
// //     setResponse(null);
// //     try {
// //       // You may want to get request_json and system from context or props
// //       const payload = {
// //         request_json: {}, // TODO: Replace with actual request_json from context
// //         system: 'BSS',    // TODO: Replace with actual system from context
// //         dimensions: selected as string[],
// //       };
// //       const res = await sendDeepDiveQuery(payload);
// //       setResponse(res);
// //     } catch (err: any) {
// //       setError(err.message || 'An error occurred');
// //     } finally {
// //       setIsLoading(false);
// //     }
// //   };

// //   const handleDownloadPDF = () => {
// //     if (reportRef.current) {
// //       html2pdf()
// //         .from(reportRef.current)
// //         .set({ filename: 'experiment_report.pdf', margin: 0.5, html2canvas: { scale: 2 } })
// //         .save();
// //     }
// //   };

// //   return (
// //     <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
// //       <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl flex flex-col items-center">
// //         <h2 className="text-2xl font-bold text-gray-800 mb-4">Deep Dive Analysis</h2>
// //         <div ref={reportRef} className="w-full flex flex-col items-center">
// //           <div className="flex flex-wrap gap-4 w-full mb-4">
// //             {[...Array(4)].map((_, i) => (
// //               <select
// //                 key={i}
// //                 className="w-48 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-gray-50 text-gray-700"
// //                 value={selected[i] || ''}
// //                 onChange={handleSelect}
// //                 disabled={!!selected[i] || selected.length >= 4}
// //               >
// //                 <option value="" disabled>
// //                   {selected[i] ? selected[i] : 'Select Dimension'}
// //                 </option>
// //                 {available.map((d) => (
// //                   <option key={d} value={d}>
// //                     {d}
// //                   </option>
// //                 ))}
// //               </select>
// //             ))}
// //           </div>
// //           <div className="flex flex-wrap gap-2 mb-6">
// //             {selected.map((dim) => (
// //               <span
// //                 key={dim}
// //                 className="flex items-center bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium shadow"
// //               >
// //                 {dim}
// //                 <button
// //                   className="ml-2 text-indigo-500 hover:text-red-500 focus:outline-none"
// //                   onClick={() => removeDimension(dim)}
// //                   aria-label={`Remove ${dim}`}
// //                 >
// //                   &times;
// //                 </button>
// //               </span>
// //             ))}
// //           </div>
// //           {response && (
// //             <div className="w-full mt-8">
// //               {/* Segments */}
// //               {response.segments && response.segments.length > 0 && (
// //                 <div className="mb-6 flex flex-col gap-4">
// //                   {response.segments.map((seg: any, idx: number) => (
// //                     <div
// //                       key={idx}
// //                       className={`rounded-xl p-4 shadow border-2 transition-colors duration-200 ${
// //                         seg.highlight
// //                           ? 'border-green-500 bg-green-50'
// //                           : 'border-gray-200 bg-white'
// //                       }`}
// //                     >
// //                       <div className="font-semibold text-gray-800 mb-1">{seg.segment}</div>
// //                       <div className="text-gray-700 mb-2">{seg.insight}</div>
// //                       {seg.metrics && seg.metrics.length > 0 && (
// //                         <table className="min-w-full text-left text-gray-700 border border-gray-200 rounded-xl mb-2">
// //                           <thead>
// //                             <tr>
// //                               {Object.keys(seg.metrics[0] || {}).map((col) => (
// //                                 <th key={col} className="px-4 py-2 font-semibold border-b border-gray-200">{col}</th>
// //                               ))}
// //                             </tr>
// //                           </thead>
// //                           <tbody>
// //                             {seg.metrics.map((row: any, ridx: number) => (
// //                               <tr key={ridx} className="border-b border-gray-100">
// //                                 {Object.values(row).map((val, i) => (
// //                                   <td key={i} className="px-4 py-2">{String(val)}</td>
// //                                 ))}
// //                               </tr>
// //                             ))}
// //                           </tbody>
// //                         </table>
// //                       )}
// //                     </div>
// //                   ))}
// //                 </div>
// //               )}
// //               {/* Overall Commentary */}
// //               {response.overall_commentary && (
// //                 <div className="bg-indigo-50 border-l-4 border-indigo-400 p-4 rounded-xl mb-4">
// //                   <div className="text-lg font-bold text-indigo-700 mb-1">Overall Commentary</div>
// //                   <div className="text-gray-800">{response.overall_commentary}</div>
// //                 </div>
// //               )}
// //             </div>
// //           )}
// //         </div>
// //         <button
// //           className={`w-full py-3 rounded-xl text-lg font-bold transition-colors duration-200 shadow-md mb-4 ${
// //             selected.length === 0 || isLoading
// //               ? 'bg-gray-300 text-gray-400 cursor-not-allowed'
// //               : 'bg-indigo-600 text-white hover:bg-indigo-700'
// //           }`}
// //           disabled={selected.length === 0 || isLoading}
// //           onClick={runAnalysis}
// //         >
// //           {isLoading ? 'Analyzing...' : 'Run Deep Dive Analysis'}
// //         </button>
// //         {isLoading && (
// //           <div className="flex flex-col items-center mb-4">
// //             <svg className="animate-spin h-8 w-8 text-indigo-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
// //               <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
// //               <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
// //             </svg>
// //             <span className="text-indigo-600 font-medium">Running analysis...</span>
// //           </div>
// //         )}
// //         {error && (
// //           <div className="mt-4 text-red-600 font-semibold">{String(error)}</div>
// //         )}
// //         {response && (
// //           <button
// //             className="w-full py-3 rounded-xl text-lg font-bold transition-colors duration-200 shadow-md bg-blue-600 text-white hover:bg-blue-700 mt-2"
// //             onClick={handleDownloadPDF}
// //           >
// //             Download PDF Report
// //           </button>
// //         )}
// //       </div>
// //     </div>
// //   );
// // };

// // export default DeepDivePage; 

// // 207 