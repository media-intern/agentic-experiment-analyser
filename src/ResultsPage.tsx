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
    // Assume each row has a 'bucket' or 'Experiment Tokens' field
    const buckets: string[] = Array.from(new Set(results.metrics_table.map((row: any) => String(row['Experiment Tokens'] || row['bucket'] || 'Bucket'))));
    // Get all unique metric names
    const metrics: string[] = Array.from(new Set(results.metrics_table.map((row: any) => String(row.name))));
    return { buckets, metrics };
  };

  const { buckets, metrics } = getBucketsAndMetrics();

  // Group rows by metric name
  const metricsMap: { [metric: string]: any[] } = {};
  if (results && results.metrics_table) {
    (results.metrics_table as any[]).forEach((row: any) => {
      const metricName = String(row.name);
      if (!metricsMap[metricName]) metricsMap[metricName] = [];
      metricsMap[metricName].push(row);
    });
  }

  // Helper to color %change
  const getPctColor = (pct: string) => {
    if (!pct || pct === '-') return 'text-gray-500';
    if (pct.startsWith('+')) return 'text-green-600 font-bold';
    if (pct.startsWith('-')) return 'text-red-600 font-bold';
    return 'text-gray-700';
  };

  // Compute %Change for each metric row after API response
  function computePercentChange(metricsTable: any[]) {
    return metricsTable.map((row) => {
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

  // Use computed metrics table for rendering
  const metricsTable = results && results.metrics_table ? computePercentChange(results.metrics_table) : [];

  // Preferred metric order (customize as needed)
  const preferredMetricOrder = [
    "Bid Price (HB Rendered Ad)",
    "Profit (HB Rendered Ad)",
    "Bidder Win Rate (1K)",
    "Bidder Rev Rate (10M)",
    "MNET Rev Rate (10M)"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div ref={reportRef} className="w-full flex flex-col items-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-2xl mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">Metrics Analysis</h2>
          <p className="text-gray-500 mb-4">Comparison with baseline</p>
          <div className="overflow-x-auto">
            {metricsTable && metricsTable.length > 0 ? (
              <table className="min-w-full border-separate border-spacing-y-2">
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
                    // Get all unique metric names
                    const allMetricNames: string[] = Array.from(new Set(metricsTable.map((m: any) => String(m.name))));
                    // Sort: preferred first, then rest alphabetically
                    const sortedMetricNames: string[] = [
                      ...preferredMetricOrder.filter(m => allMetricNames.includes(m)),
                      ...allMetricNames.filter(m => !preferredMetricOrder.includes(m)).sort()
                    ];
                    return (sortedMetricNames as string[]).map((metricName: string) => {
                      const m = metricsTable.find((x: any) => x.name === metricName);
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