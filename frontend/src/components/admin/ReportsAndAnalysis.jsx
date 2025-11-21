import React, { useState, useMemo } from 'react';
import { reports as initialReports, getStatusColor, getSeverityColor } from '../../data/adminData';

export default function ReportsAndAnalysis() {
	const [reports, setReports] = useState(initialReports);

	const resolveReport = (reportId) => {
		setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
	};

	const blockUser = (reportId) => {
		const report = reports.find(r => r.id === reportId);
		if (report) {
			// In a real application, you would also update the user's status in the users data
			console.log(`Blocking user: ${report.reportedUser} due to report ID: ${report.id}`);
			setReports(reports.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
		}
	};

	return (
		<div className="space-y-4">
			<div className="space-y-3">
				{reports.map(report => (
					<div key={report.id} className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<div className="flex items-center gap-2 mb-2">
									<h3 className="text-white font-semibold">Report on {report.reportedUser}</h3>
									<span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(report.severity)}`}>
										{report.severity}
									</span>
								</div>
								<p className="text-slate-400 text-sm">Type: {report.type}</p>
								<p className="text-slate-400 text-sm">Reason: {report.reason}</p>
								<p className="text-slate-400 text-sm">Reported by: {report.reporter}</p>
							</div>
							<span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(report.status)}`}>
								{report.status}
							</span>
						</div>
						{report.status === 'pending' && (
							<div className="flex gap-2 mt-4">
								<button
									onClick={() => resolveReport(report.id)}
									className="flex-1 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
								>
									Resolve
								</button>
								<button
									onClick={() => blockUser(report.id)}
									className="flex-1 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
								>
									Block User
								</button>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
