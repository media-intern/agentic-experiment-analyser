import React from 'react';

const summary = [
  { label: 'Total Experiments', value: 3, desc: 'All experiment runs' },
  { label: 'Completed', value: 2, desc: 'Finished experiments' },
  { label: 'In Progress', value: 1, desc: 'Running experiments' },
];

const experimentTable = [
  { name: 'Experiment A', status: 'Completed', date: '2025-05-12' },
  { name: 'Experiment B', status: 'In Progress', date: '2025-05-15' },
  { name: 'Experiment C', status: 'Completed', date: '2025-05-18' },
];

const statusBadge = (status: string) => {
  if (status === 'Completed') {
    return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Completed</span>;
  }
  if (status === 'In Progress') {
    return <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">In Progress</span>;
  }
  return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">{status}</span>;
};

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <h1 className="text-4xl font-bold text-indigo-700 mb-8 text-center">Experiment Analysis Dashboard</h1>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {summary.map(card => (
            <div key={card.label} className="bg-white rounded-2xl shadow-lg p-8 flex flex-col items-start border border-indigo-100 hover:shadow-xl transition">
              <div className="text-2xl font-bold text-indigo-700 mb-1">{card.label}</div>
              <div className="text-gray-500 mb-6">{card.desc}</div>
              <div className="text-5xl font-extrabold text-indigo-900">{card.value}</div>
            </div>
          ))}
        </div>
        {/* Recent Experiments Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-8">
          <h2 className="text-2xl font-bold text-indigo-700 mb-1">Recent Experiments</h2>
          <div className="text-gray-500 mb-6">View and generate reports for your experiments</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-indigo-900">
              <thead>
                <tr className="border-b border-indigo-100 text-lg">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {experimentTable.map((exp, idx) => (
                  <tr key={idx} className="border-t border-indigo-50 text-base hover:bg-indigo-50/40 transition">
                    <td className="px-4 py-4 font-medium">{exp.name}</td>
                    <td className="px-4 py-4">{statusBadge(exp.status)}</td>
                    <td className="px-4 py-4">{exp.date}</td>
                    <td className="px-4 py-4">
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 font-semibold text-indigo-700 shadow-sm transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8M8 12h8m-8-4h8M4 6h16M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6" /></svg>
                        Generate Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage; 