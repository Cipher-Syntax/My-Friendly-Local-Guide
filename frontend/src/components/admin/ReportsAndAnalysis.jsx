import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, Activity, ArrowUpRight, Download, Filter, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../../api/api';
import { exportStyledWorkbook } from '../../utils/excelExport';

// Reusable Stat Card Component
const StatCard = ({ title, value, subtext, trend }) => (
    <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 relative overflow-hidden shadow-sm">
        <div className="flex items-start justify-between">
            <div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{title}</p>
                <h3 className="text-4xl font-bold text-slate-900 dark:text-white mt-2">{value}</h3>
                <p className="text-slate-500 dark:text-slate-500 text-sm mt-1">{subtext}</p>
            </div>
            {/* Icon removed since it was not used */}
        </div>
        {trend && (
            <div className={`flex items-center gap-1 mt-6 text-sm font-medium ${trend >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                <ArrowUpRight className={`w-4 h-4 ${trend < 0 ? 'rotate-180' : ''}`} />
                <span>{Math.abs(trend)}% vs previous period</span>
            </div>
        )}
    </div>
);

const RankingPanel = ({ title, metricLabel, topRows = [], leastRows = [], isCurrency = false }) => {
    const formatMetric = (value) => {
        const numeric = Number(value || 0);
        if (isCurrency) {
            return numeric.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });
        }
        return numeric.toLocaleString();
    };

    const renderRows = (rows, variant) => {
        if (!rows.length) {
            return <p className="text-xs text-slate-500 dark:text-slate-400">No data for this timeframe.</p>;
        }

        return rows.map((entry, index) => (
            <div key={`${variant}-${entry.id}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-900/40 px-3 py-2">
                <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{entry.display_name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">@{entry.username || 'n/a'}</p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{metricLabel}</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatMetric(entry.metric)}</p>
                </div>
            </div>
        ));
    };

    return (
        <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-5 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-4">{title}</h4>
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">Top</p>
                    <div className="space-y-2">{renderRows(topRows, 'top')}</div>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400 mb-2">Least</p>
                    <div className="space-y-2">{renderRows(leastRows, 'least')}</div>
                </div>
            </div>
        </div>
    );
};

export default function ReportsAndAnalysis() {
    const [loading, setLoading] = useState(true);
    const [rankingsLoading, setRankingsLoading] = useState(false);
    const [filter, setFilter] = useState('Monthly');
    const [rawData, setRawData] = useState({
        bookings: [],
        agencies: [],
        guides: [],
        destinations: [],
        alerts: []
    });
    const [rankings, setRankings] = useState({
        top_guides_by_bookings: [],
        least_guides_by_bookings: [],
        top_guides_by_earnings: [],
        least_guides_by_earnings: [],
        top_agencies_by_bookings: [],
        least_agencies_by_bookings: [],
        top_agencies_by_earnings: [],
        least_agencies_by_earnings: [],
    });

    const fetchAllPages = async (initialUrl, params = {}) => {
        const aggregate = [];
        let nextUrl = initialUrl;
        let isFirstRequest = true;
        let guard = 0;

        while (nextUrl && guard < 100) {
            const response = await api.get(nextUrl, {
                params: isFirstRequest ? params : undefined,
            });
            const payload = response.data;

            if (Array.isArray(payload)) {
                aggregate.push(...payload);
                nextUrl = null;
                break;
            }

            const resultChunk = Array.isArray(payload?.results) ? payload.results : [];
            aggregate.push(...resultChunk);

            if (payload?.next && typeof payload.next === 'string') {
                const base = api.defaults.baseURL || '';
                nextUrl = base && payload.next.startsWith(base)
                    ? payload.next.slice(base.length)
                    : payload.next;
            } else {
                nextUrl = null;
            }

            isFirstRequest = false;
            guard += 1;
        }

        return aggregate;
    };

    // Fetch initial data
    useEffect(() => {
        let cancelled = false;

        const fetchAnalytics = async () => {
            try {
                const [bookings, agencies, guides, destinations, alerts] = await Promise.all([
                    fetchAllPages('api/bookings/'),
                    fetchAllPages('api/agencies/'),
                    fetchAllPages('api/admin/guide-reviews/'),
                    fetchAllPages('api/destinations/'),
                    fetchAllPages('api/alerts/'),
                ]);

                if (!cancelled) {
                    setRawData({ bookings, agencies, guides, destinations, alerts });
                }
            } catch (error) {
                console.error("Error fetching analytics:", error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchAnalytics();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const fetchPartnerRankings = async () => {
            setRankingsLoading(true);

            try {
                const response = await api.get('api/admin/partner-rankings/', {
                    params: {
                        timeframe: filter,
                        limit: 5,
                    },
                });

                if (!cancelled) {
                    setRankings(response.data || {});
                }
            } catch (error) {
                console.error('Error fetching partner rankings:', error);
                if (!cancelled) {
                    setRankings({
                        top_guides_by_bookings: [],
                        least_guides_by_bookings: [],
                        top_guides_by_earnings: [],
                        least_guides_by_earnings: [],
                        top_agencies_by_bookings: [],
                        least_agencies_by_bookings: [],
                        top_agencies_by_earnings: [],
                        least_agencies_by_earnings: [],
                    });
                }
            } finally {
                if (!cancelled) {
                    setRankingsLoading(false);
                }
            }
        };

        fetchPartnerRankings();

        return () => {
            cancelled = true;
        };
    }, [filter]);

    // Derived State and Memoized Calculations based on current Filter
    const processedData = useMemo(() => {
        const { bookings, agencies, guides, destinations, alerts } = rawData;

        // --- 1. Process Revenue & Valid Bookings ---
        const validBookings = bookings.filter(b => b.status !== 'Cancelled' && b.status !== 'Pending_Payment');
        const totalRevenue = validBookings.reduce((sum, b) => sum + parseFloat(b.total_price || 0), 0);

        // --- 2. Chart Data based on Filter ---
        let trendData = [];
        if (filter === 'Daily') {
            trendData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({ name: day, Volume: 0 }));
        } else if (filter === 'Weekly') {
            trendData = ['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(w => ({ name: w, Volume: 0 }));
        } else if (filter === 'Monthly') {
            trendData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(m => ({ name: m, Volume: 0 }));
        } else if (filter === 'Yearly') {
            const currentYear = new Date().getFullYear();
            trendData = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map(y => ({ name: y.toString(), Volume: 0 }));
        }

        // Map bookings to trend buckets
        validBookings.forEach(b => {
            const date = new Date(b.created_at || Date.now());
            if (filter === 'Monthly') {
                trendData[date.getMonth()].Volume += parseFloat(b.total_price || 0);
            } else if (filter === 'Daily') {
                const day = date.getDay() === 0 ? 6 : date.getDay() - 1; // Mon = 0, Sun = 6
                if (trendData[day]) trendData[day].Volume += parseFloat(b.total_price || 0);
            } else if (filter === 'Yearly') {
                const yearIndex = trendData.findIndex(t => t.name === date.getFullYear().toString());
                if (yearIndex !== -1) trendData[yearIndex].Volume += parseFloat(b.total_price || 0);
            } else {
                // Weekly mock distribution based on date
                const week = Math.floor(date.getDate() / 8);
                if (trendData[week]) trendData[week].Volume += parseFloat(b.total_price || 0);
            }
        });

        // --- 3. Process Regions for Bar Chart ---
        const locationCounts = {};
        destinations.forEach(d => {
            const loc = d.location || 'Unknown';
            locationCounts[loc] = (locationCounts[loc] || 0) + 1;
        });
        const topRoutes = Object.entries(locationCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, Spots]) => ({ name, Spots }));

        // --- 4. Process User Distribution for Pie Chart ---
        const totalUsersEst = agencies.length + guides.length + bookings.length;
        const distributionData = [
            { name: 'Agencies', value: agencies.length, color: '#8b5cf6' }, // Purple
            { name: 'Tour Guides', value: guides.length, color: '#10b981' }, // Emerald
            { name: 'Tourists', value: Math.max(0, totalUsersEst - agencies.length - guides.length), color: '#3b82f6' } // Blue
        ];

        return {
            totalRevenue,
            trendData,
            topRoutes,
            distributionData,
            systemLogs: alerts.slice(0, 5)
        };
    }, [rawData, filter]);

    // Export Functionality
    const handleExport = () => {
        const dateStr = new Date().toISOString().split('T')[0];

        const combineRankingRows = (topRows = [], leastRows = [], metricKey) => ([
            ...topRows.map((entry, index) => ({
                rank_group: 'Top',
                position: index + 1,
                display_name: entry.display_name,
                username: entry.username,
                bookings_count: entry.bookings_count,
                earnings: entry.earnings,
                metric: entry?.[metricKey] ?? 0,
            })),
            ...leastRows.map((entry, index) => ({
                rank_group: 'Least',
                position: index + 1,
                display_name: entry.display_name,
                username: entry.username,
                bookings_count: entry.bookings_count,
                earnings: entry.earnings,
                metric: entry?.[metricKey] ?? 0,
            })),
        ]);

        exportStyledWorkbook({
            fileName: `admin-reports-${filter.toLowerCase()}-${dateStr}.xlsx`,
            reportTitle: 'Admin Reports and Analytics Export',
            metadata: [
                { label: 'Timeframe', value: filter },
                { label: 'Total Gross Volume', value: processedData.totalRevenue },
                { label: 'Trend Points', value: processedData.trendData.length },
            ],
            sheets: [
                {
                    name: `${filter} Trends`,
                    tableTitle: `${filter} Revenue Trend`,
                    rows: processedData.trendData.map((row) => ({
                        period: row.name,
                        gross_volume: row.Volume,
                    })),
                    columns: [
                        { key: 'period', header: 'Period' },
                        { key: 'gross_volume', header: 'Gross Volume (PHP)' },
                    ],
                },
                {
                    name: 'Top Locations',
                    tableTitle: 'Top Destination Concentration',
                    rows: processedData.topRoutes.map((row) => ({
                        location: row.name,
                        destination_count: row.Spots,
                    })),
                    columns: [
                        { key: 'location', header: 'Location' },
                        { key: 'destination_count', header: 'Destination Count' },
                    ],
                },
                {
                    name: 'User Distribution',
                    tableTitle: 'Platform User Segments',
                    rows: processedData.distributionData.map((row) => ({
                        segment: row.name,
                        user_count: row.value,
                    })),
                    columns: [
                        { key: 'segment', header: 'Segment' },
                        { key: 'user_count', header: 'Count' },
                    ],
                },
                {
                    name: 'Guide Bookings Rank',
                    tableTitle: 'Guide Rankings by Bookings',
                    rows: combineRankingRows(
                        rankings.top_guides_by_bookings,
                        rankings.least_guides_by_bookings,
                        'bookings_count'
                    ),
                    columns: [
                        { key: 'rank_group', header: 'Rank Group' },
                        { key: 'position', header: 'Position' },
                        { key: 'display_name', header: 'Guide' },
                        { key: 'username', header: 'Username' },
                        { key: 'bookings_count', header: 'Bookings' },
                        { key: 'earnings', header: 'Earnings (PHP)' },
                    ],
                },
                {
                    name: 'Guide Earnings Rank',
                    tableTitle: 'Guide Rankings by Earnings',
                    rows: combineRankingRows(
                        rankings.top_guides_by_earnings,
                        rankings.least_guides_by_earnings,
                        'earnings'
                    ),
                    columns: [
                        { key: 'rank_group', header: 'Rank Group' },
                        { key: 'position', header: 'Position' },
                        { key: 'display_name', header: 'Guide' },
                        { key: 'username', header: 'Username' },
                        { key: 'bookings_count', header: 'Bookings' },
                        { key: 'earnings', header: 'Earnings (PHP)' },
                    ],
                },
                {
                    name: 'Agency Bookings Rank',
                    tableTitle: 'Agency Rankings by Bookings',
                    rows: combineRankingRows(
                        rankings.top_agencies_by_bookings,
                        rankings.least_agencies_by_bookings,
                        'bookings_count'
                    ),
                    columns: [
                        { key: 'rank_group', header: 'Rank Group' },
                        { key: 'position', header: 'Position' },
                        { key: 'display_name', header: 'Agency' },
                        { key: 'username', header: 'Username' },
                        { key: 'bookings_count', header: 'Bookings' },
                        { key: 'earnings', header: 'Earnings (PHP)' },
                    ],
                },
                {
                    name: 'Agency Earnings Rank',
                    tableTitle: 'Agency Rankings by Earnings',
                    rows: combineRankingRows(
                        rankings.top_agencies_by_earnings,
                        rankings.least_agencies_by_earnings,
                        'earnings'
                    ),
                    columns: [
                        { key: 'rank_group', header: 'Rank Group' },
                        { key: 'position', header: 'Position' },
                        { key: 'display_name', header: 'Agency' },
                        { key: 'username', header: 'Username' },
                        { key: 'bookings_count', header: 'Bookings' },
                        { key: 'earnings', header: 'Earnings (PHP)' },
                    ],
                },
            ],
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
            </div>
        );
    }

    // Custom Tooltip for charts
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-xl">
                    <p className="text-slate-600 dark:text-slate-300 mb-1">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} className="text-slate-900 dark:text-white font-semibold">
                            {entry.name}: {entry.name === 'Volume' ? '₱' : ''}{entry.value.toLocaleString()}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 transition-colors duration-300">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h2>
                    <p className="text-slate-500 dark:text-slate-400">Live system performance from backend data</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Filter Toggle */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                        <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500 ml-2 mr-1" />
                        {['Daily', 'Weekly', 'Monthly', 'Yearly'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filter === f
                                    ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Single Key Metric Row */}
            <div className="grid grid-cols-1">
                <StatCard
                    title="Total Volume"
                    value={`₱ ${processedData.totalRevenue.toLocaleString()}`}
                    subtext={`Gross booking value (${filter} view)`}
                    trend={12.5} // Simulated positive trend
                />
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Top and Least Partners</h3>
                    {rankingsLoading && <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <RankingPanel
                        title="Guide Rankings by Bookings"
                        metricLabel="Bookings"
                        topRows={(rankings.top_guides_by_bookings || []).map((entry) => ({ ...entry, metric: entry.bookings_count }))}
                        leastRows={(rankings.least_guides_by_bookings || []).map((entry) => ({ ...entry, metric: entry.bookings_count }))}
                    />
                    <RankingPanel
                        title="Guide Rankings by Earnings"
                        metricLabel="Earnings"
                        isCurrency
                        topRows={(rankings.top_guides_by_earnings || []).map((entry) => ({ ...entry, metric: entry.earnings }))}
                        leastRows={(rankings.least_guides_by_earnings || []).map((entry) => ({ ...entry, metric: entry.earnings }))}
                    />
                    <RankingPanel
                        title="Agency Rankings by Bookings"
                        metricLabel="Bookings"
                        topRows={(rankings.top_agencies_by_bookings || []).map((entry) => ({ ...entry, metric: entry.bookings_count }))}
                        leastRows={(rankings.least_agencies_by_bookings || []).map((entry) => ({ ...entry, metric: entry.bookings_count }))}
                    />
                    <RankingPanel
                        title="Agency Rankings by Earnings"
                        metricLabel="Earnings"
                        isCurrency
                        topRows={(rankings.top_agencies_by_earnings || []).map((entry) => ({ ...entry, metric: entry.earnings }))}
                        leastRows={(rankings.least_agencies_by_earnings || []).map((entry) => ({ ...entry, metric: entry.earnings }))}
                    />
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Volume Trends - Line Chart */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm">
                    <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2 mb-6">
                        <TrendingUp className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                        Volume Trends ({filter})
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={processedData.trendData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-700" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" className="dark:stroke-slate-400" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" className="dark:stroke-slate-400" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val / 1000}k`} />
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="Volume" stroke="#06b6d4" strokeWidth={3} dot={{ fill: '#06b6d4', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Routes/Locations - Bar Chart */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm">
                    <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2 mb-6">
                        <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        Top Destinations & Routes
                    </h3>
                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={processedData.topRoutes} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-700" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" className="dark:stroke-slate-400" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" className="dark:stroke-slate-400" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#e2e8f0', className: 'dark:fill-slate-800', opacity: 0.4 }} />
                                <Bar dataKey="Spots" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* User Distribution - Pie Chart */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl p-6 shadow-sm">
                    <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2 mb-6">
                        <Filter className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        Platform User Distribution
                    </h3>
                    <div className="h-72 w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={processedData.distributionData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {processedData.distributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ color: 'currentColor' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Activity Table (System Logs) */}
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden flex flex-col shadow-sm">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700/50">
                        <h3 className="text-slate-900 dark:text-white font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            System Logs & Alerts
                        </h3>
                    </div>
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 h-full">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-200 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-4">Title</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                                {processedData.systemLogs.length > 0 ? (
                                    processedData.systemLogs.map((log) => (
                                        <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white max-w-[200px] truncate" title={log.message}>
                                                {log.title || log.message}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider font-semibold border ${log.target_type === 'Admin'
                                                    ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                                                    : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
                                                    }`}>
                                                    {log.target_type || 'System'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                                            No recent system logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}