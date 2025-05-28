import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalysisContext } from './contexts/AnalysisContext';
// @ts-ignore
import html2pdf from 'html2pdf.js';

const ResultsPage = () => {
  const { results } = useAnalysisContext();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    if (!results) {
      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
      navigate('/upload');
      }, 1800);
    }
  }, [results, navigate]);

  if (!results) return (
    showPopup ? (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white border border-red-300 rounded-xl shadow-lg px-8 py-6 text-center">
          <div className="text-lg font-bold text-red-600 mb-2">Please upload experiment request</div>
          <div className="text-gray-700">You must upload and analyze an experiment before viewing results.</div>
        </div>
        <div className="fixed inset-0 bg-black opacity-30 z-40" />
      </div>
    ) : null
  );

  const handleDownloadPDF = () => {
    if (reportRef.current) {
      html2pdf()
        .from(reportRef.current)
        .set({ filename: 'experiment_report.pdf', margin: 0.5, html2canvas: { scale: 2 } })
        .save();
    }
  };

  // Helper to get unique bucket names and metrics
  const getBucketsAndMetrics = (): { buckets: string[]; metrics: string[] } => {
    if (!results || !results.metrics_table) return { buckets: [], metrics: [] };
    
    // Get all column names except 'name' and 'control'
    const columns = Object.keys(results.metrics_table[0] || {});
    const buckets = columns.filter(col => !col.endsWith('_change') && col !== 'name' && col !== 'control');
    const metrics = results.metrics_table.map((row: any) => row.name);
    
    return { buckets, metrics };
  };

  const { buckets, metrics } = getBucketsAndMetrics();

  // Helper to color percentage changes
  const getPctColor = (pct: string) => {
    if (!pct || pct === '-') return 'text-gray-500';
    const value = parseFloat(pct);
    if (isNaN(value)) return 'text-gray-500';
    if (value > 0) return 'text-green-600 font-bold';
    if (value < 0) return 'text-red-600 font-bold';
    return 'text-gray-700';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div ref={reportRef} className="w-full flex flex-col items-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Metrics Analysis</h2>
          <p className="text-gray-500 mb-4">Comparison with baseline</p>
          <div className="overflow-x-auto">
            {results && results.metrics_table && results.metrics_table.length > 0 ? (
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-gray-600 text-sm">
                    <th className="px-4 py-2">Metric</th>
                    <th className="px-4 py-2">Control</th>
                    {buckets.map((bucket, index) => (
                      <React.Fragment key={bucket}>
                        <th className="px-4 py-2">{bucket}</th>
                        <th className="px-4 py-2">% Change</th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.metrics_table.map((row: any, rowIndex: number) => (
                    <tr key={rowIndex} className="bg-white">
                      <td className="px-4 py-2 font-medium text-gray-900">{row.name}</td>
                      <td className="px-4 py-2 text-gray-700">{row.control}</td>
                      {buckets.map((bucket) => (
                        <React.Fragment key={bucket}>
                          <td className="px-4 py-2 text-gray-700">{row[bucket]}</td>
                          <td className={`px-4 py-2 ${getPctColor(row[`${bucket}_change`])}`}>
                            {row[`${bucket}_change`]}
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center text-gray-500 py-4">No metrics data available</div>
            )}
          </div>
        </div>
        {results.final_verdict && (
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-xl mb-4 w-full max-w-2xl">
            <div className="text-lg font-bold text-green-700 mb-1">Final Verdict</div>
            <div className="text-gray-800">{results.final_verdict}</div>
          </div>
        )}
        {results.scalability_verdict && results.scalability_verdict.verdict && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-xl mb-4 w-full max-w-2xl">
            <div className="text-lg font-bold text-blue-700 mb-1">Scalability Verdict</div>
            <div className="text-blue-900 font-semibold mb-1">{results.scalability_verdict.verdict}</div>
            {results.scalability_verdict.reasons && results.scalability_verdict.reasons.length > 0 && (
              <ul className="list-disc pl-6 text-gray-800 space-y-1">
                {results.scalability_verdict.reasons.map((reason: string, idx: number) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {results.key_insights && results.key_insights.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6 w-full max-w-2xl mb-4">
            <h3 className="text-xl font-bold text-indigo-700 mb-2">Key Insights</h3>
            <ul className="list-disc pl-6 text-gray-700 space-y-1">
              {results.key_insights.map((v: string, i: number) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex gap-4 mt-2">
        <button
          className="px-6 py-3 rounded-xl text-lg font-bold transition-colors duration-200 shadow-md bg-indigo-600 text-white hover:bg-indigo-700"
          onClick={() => navigate('/deep-dive')}
        >
          Deep Dive
        </button>
        <button
          className="px-6 py-3 rounded-xl text-lg font-bold transition-colors duration-200 shadow-md bg-blue-600 text-white hover:bg-blue-700"
          onClick={handleDownloadPDF}
        >
          Download Report PDF
        </button>
      </div>
    </div>
  );
};

export default ResultsPage; 