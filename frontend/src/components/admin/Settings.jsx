import React, { useState } from 'react';
import { NAME_REGEX, NAME_ERROR_MESSAGE, EMAIL_REGEX, EMAIL_ERROR_MESSAGE, PHONE_ERROR_MESSAGE } from '../../utils/validation';

export default function Settings() {
	const [formValues, setFormValues] = useState({
		fullName: '',
		adminEmail: '',
		supportEmail: '',
		supportPhone: '',
	});
	const [fieldErrors, setFieldErrors] = useState({});
	const [statusMessage, setStatusMessage] = useState('');

	const setFieldValue = (field, value) => {
		setFormValues((prev) => ({ ...prev, [field]: value }));
		setFieldErrors((prev) => {
			if (!prev[field]) return prev;
			return { ...prev, [field]: '' };
		});
		if (statusMessage) setStatusMessage('');
	};

	const handleSaveSettings = () => {
		const nextErrors = {};
		const trimmedFullName = String(formValues.fullName || '').trim();
		const trimmedAdminEmail = String(formValues.adminEmail || '').trim();
		const trimmedSupportEmail = String(formValues.supportEmail || '').trim();
		const phoneDigits = String(formValues.supportPhone || '').replace(/\D/g, '');

		if (trimmedFullName && !NAME_REGEX.test(trimmedFullName)) {
			nextErrors.fullName = NAME_ERROR_MESSAGE;
		}

		if (trimmedAdminEmail && !EMAIL_REGEX.test(trimmedAdminEmail)) {
			nextErrors.adminEmail = EMAIL_ERROR_MESSAGE;
		}

		if (trimmedSupportEmail && !EMAIL_REGEX.test(trimmedSupportEmail)) {
			nextErrors.supportEmail = EMAIL_ERROR_MESSAGE;
		}

		if (formValues.supportPhone && phoneDigits.length < 10) {
			nextErrors.supportPhone = PHONE_ERROR_MESSAGE;
		}

		if (Object.values(nextErrors).some(Boolean)) {
			setFieldErrors(nextErrors);
			setStatusMessage('Please fix the highlighted fields before saving.');
			return;
		}

		setFieldErrors({});
		setStatusMessage('Settings validated successfully.');
	};

	return (
		<div className="space-y-6">
			{!!statusMessage && (
				<div className={`rounded-xl p-3 text-sm font-semibold ${Object.values(fieldErrors).some(Boolean) ? 'bg-red-500/15 border border-red-500/30 text-red-300' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'}`}>
					{statusMessage}
				</div>
			)}

			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
				<h3 className="text-white text-lg font-semibold mb-4">Admin Profile</h3>
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-white text-sm font-medium mb-2">Full Name</label>
							<input
								type="text"
								placeholder="Admin Name"
								value={formValues.fullName}
								onChange={(e) => setFieldValue('fullName', e.target.value)}
								className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
							/>
							{!!fieldErrors.fullName && <p className="text-red-400 text-xs mt-2">{fieldErrors.fullName}</p>}
						</div>
						<div>
							<label className="block text-white text-sm font-medium mb-2">Email</label>
							<input
								type="email"
								placeholder="admin@system.com"
								value={formValues.adminEmail}
								onChange={(e) => setFieldValue('adminEmail', e.target.value)}
								className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
							/>
							{!!fieldErrors.adminEmail && <p className="text-red-400 text-xs mt-2">{fieldErrors.adminEmail}</p>}
						</div>
					</div>
				</div>
			</div>

			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
				<h3 className="text-white text-lg font-semibold mb-4">System Configuration</h3>
				<div className="space-y-4">
					<div>
						<label className="block text-white text-sm font-medium mb-2">Platform Name</label>
						<input
							type="text"
							placeholder="My Friendly Local Guide"
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
					</div>
					<div>
						<label className="block text-white text-sm font-medium mb-2">Support Email</label>
						<input
							type="email"
							placeholder="support@system.com"
							value={formValues.supportEmail}
							onChange={(e) => setFieldValue('supportEmail', e.target.value)}
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
						{!!fieldErrors.supportEmail && <p className="text-red-400 text-xs mt-2">{fieldErrors.supportEmail}</p>}
					</div>
					<div>
						<label className="block text-white text-sm font-medium mb-2">Support Phone</label>
						<input
							type="tel"
							placeholder="+63 (0) 900-000-0000"
							value={formValues.supportPhone}
							onChange={(e) => setFieldValue('supportPhone', e.target.value)}
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
						{!!fieldErrors.supportPhone && <p className="text-red-400 text-xs mt-2">{fieldErrors.supportPhone}</p>}
					</div>
				</div>
			</div>

			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
				<h3 className="text-white text-lg font-semibold mb-4">Content Moderation</h3>
				<div className="space-y-4">
					<div>
						<label className="block text-white text-sm font-medium mb-2">Max Warnings Before Auto-Restriction</label>
						<input
							type="number"
							placeholder="3"
							min="1"
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
					</div>
					<div>
						<label className="block text-white text-sm font-medium mb-2">Auto-Approve Accommodations After (days)</label>
						<input
							type="number"
							placeholder="7"
							min="1"
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
					</div>
					<div>
						<label className="block text-white text-sm font-medium mb-2">Minimum Guide Rating to Post</label>
						<input
							type="number"
							placeholder="3.5"
							min="0"
							step="0.1"
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
					</div>
				</div>
			</div>

			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
				<h3 className="text-white text-lg font-semibold mb-4">Notification Preferences</h3>
				<div className="space-y-3">
					<div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
						<input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-cyan-500" />
						<div className="flex-1">
							<label className="text-white text-sm font-medium block">Email on New Applications</label>
							<p className="text-slate-400 text-xs">Receive emails when agencies/guides apply</p>
						</div>
					</div>
					<div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
						<input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-cyan-500" />
						<div className="flex-1">
							<label className="text-white text-sm font-medium block">Email on New Reports</label>
							<p className="text-slate-400 text-xs">Receive emails when users are reported</p>
						</div>
					</div>
					<div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
						<input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-cyan-500" />
						<div className="flex-1">
							<label className="text-white text-sm font-medium block">Email on User Restrictions</label>
							<p className="text-slate-400 text-xs">Receive emails when users are restricted</p>
						</div>
					</div>
					<div className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
						<input type="checkbox" defaultChecked className="w-4 h-4 rounded accent-cyan-500" />
						<div className="flex-1">
							<label className="text-white text-sm font-medium block">Email on Content Violations</label>
							<p className="text-slate-400 text-xs">Receive emails on policy violations</p>
						</div>
					</div>
				</div>
			</div>

			<div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
				<h3 className="text-white text-lg font-semibold mb-4">Security & Privacy</h3>
				<div className="space-y-4">
					<div>
						<label className="block text-white text-sm font-medium mb-2">Current Password</label>
						<input
							type="password"
							placeholder="••••••••"
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
					</div>
					<div>
						<label className="block text-white text-sm font-medium mb-2">New Password</label>
						<input
							type="password"
							placeholder="••••••••"
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
					</div>
					<div>
						<label className="block text-white text-sm font-medium mb-2">Confirm New Password</label>
						<input
							type="password"
							placeholder="••••••••"
							className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
						/>
					</div>
				</div>
			</div>

			<div className="flex gap-3">
				<button className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium">
					Reset to Defaults
				</button>
				<button onClick={handleSaveSettings} className="flex-1 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium">
					Save Settings
				</button>
			</div>
		</div>
	);
}
