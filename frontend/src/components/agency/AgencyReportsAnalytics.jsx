import React, { useMemo, useState } from 'react';
import { BarChart3, TrendingUp, PieChart as PieChartIcon, Calendar, Users, Download } from 'lucide-react';
import {
    ResponsiveContainer,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip as RechartsTooltip,
    Legend,
    BarChart,
    Bar,
    AreaChart,
    Area,
    PieChart as RechartsPieChart,
    Pie,
    Cell,
} from 'recharts';
import { exportStyledWorkbook } from '../../utils/excelExport';

const STATUS_COLOR_MAP = {
    pending: '#F59E0B',
    accepted: '#22C55E',
    confirmed: '#06B6D4',
    pending_payment: '#F97316',
    completed: '#2563EB',
    declined: '#EF4444',
    cancelled: '#DC2626',
    refunded: '#14B8A6',
};

const TIMEFRAME_OPTIONS = [
    { id: '6m', label: '6 Months', months: 6 },
    { id: '12m', label: '12 Months', months: 12 },
    { id: '24m', label: '24 Months', months: 24 },
];

const toAmount = (value) => Number(value || 0);

const getBookingDate = (booking) => {
    const raw = booking?.created_at || booking?.check_in || booking?.check_out;
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getMonthLabel = (date) =>
    date.toLocaleDateString('en-US', {
        month: 'short',
        year: '2-digit',
    });

const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg shadow-xl">
            <p className="text-slate-600 dark:text-slate-300 mb-1 text-xs font-semibold">{label}</p>
            {payload.map((entry) => (
                <p key={`${entry.name}-${entry.value}`} className="text-slate-900 dark:text-white text-sm font-semibold">
                    {entry.name}: {entry.name.toLowerCase().includes('revenue') ? '₱ ' : ''}
                    {Number(entry.value || 0).toLocaleString()}
                </p>
            ))}
        </div>
    );
};


export default function AgencyReportsAnalytics({ bookings = [], guides = [] }) {
    const [timeframe, setTimeframe] = useState('6m');

    const monthsToShow = useMemo(() => {
        return TIMEFRAME_OPTIONS.find((option) => option.id === timeframe)?.months || 6;
    }, [timeframe]);

    const monthBuckets = useMemo(() => {
        const now = new Date();
        const buckets = [];

        for (let offset = monthsToShow - 1; offset >= 0; offset -= 1) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
            buckets.push({
                key: getMonthKey(monthDate),
                label: getMonthLabel(monthDate),
                bookings: 0,
                revenue: 0,
            });
        }

        return buckets;
    }, [monthsToShow]);

    const scopedBookings = useMemo(() => {
        if (!Array.isArray(bookings) || bookings.length === 0 || monthBuckets.length === 0) return [];

        const [yearStr, monthStr] = monthBuckets[0].key.split('-');
        const cutoffTime = new Date(Number(yearStr), Number(monthStr) - 1, 1).getTime();

        return bookings.filter((booking) => {
            const bookingDate = getBookingDate(booking);
            return bookingDate ? bookingDate.getTime() >= cutoffTime : false;
        });
    }, [bookings, monthBuckets]);

    const trendData = useMemo(() => {
        const byMonth = new Map(monthBuckets.map((bucket) => [bucket.key, { ...bucket }]));

        scopedBookings.forEach((booking) => {
            const bookingDate = getBookingDate(booking);
            if (!bookingDate) return;

            const key = getMonthKey(bookingDate);
            const bucket = byMonth.get(key);
            if (!bucket) return;

            bucket.bookings += 1;
            bucket.revenue += toAmount(booking?.total_price);
        });

        return Array.from(byMonth.values()).map((entry) => ({
            ...entry,
            revenue: Number(entry.revenue.toFixed(2)),
        }));
    }, [monthBuckets, scopedBookings]);

    const statusData = useMemo(() => {
        const counts = {};

        scopedBookings.forEach((booking) => {
            const status = String(booking?.status || 'unknown').toLowerCase();
            counts[status] = (counts[status] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([status, value]) => ({
                name: status.replace('_', ' '),
                value,
                color: STATUS_COLOR_MAP[status] || '#94A3B8',
            }))
            .sort((a, b) => b.value - a.value);
    }, [scopedBookings]);

    const destinationData = useMemo(() => {
        const counts = {};

        scopedBookings.forEach((booking) => {
            const destination = booking?.destination_detail?.name || booking?.accommodation_detail?.title || booking?.location || 'Unknown';
            counts[destination] = (counts[destination] || 0) + 1;
        });

        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);
    }, [scopedBookings]);

    const totalRevenue = useMemo(() => {
        return scopedBookings.reduce((sum, booking) => sum + toAmount(booking?.total_price), 0);
    }, [scopedBookings]);

    const completedCount = useMemo(() => {
        return scopedBookings.filter((booking) => String(booking?.status || '').toLowerCase() === 'completed').length;
    }, [scopedBookings]);

    const completionRate = scopedBookings.length === 0 ? 0 : (completedCount / scopedBookings.length) * 100;

    const activeGuides = useMemo(() => {
        return guides.filter((guide) => Boolean(guide?.available || guide?.is_active)).length;
    }, [guides]);

    const averageBookingValue = scopedBookings.length === 0 ? 0 : totalRevenue / scopedBookings.length;

    const handleExportAnalyticsReport = () => {
        if (scopedBookings.length === 0) return;

        const dateStr = new Date().toISOString().slice(0, 10);
        exportStyledWorkbook({
            fileName: `agency-reports-analytics-${timeframe}-${dateStr}.xlsx`,
            reportTitle: 'Agency Reports and Analytics Export',
            metadata: [
                { label: 'Timeframe', value: timeframe },
                { label: 'Bookings in Scope', value: scopedBookings.length },
                { label: 'Gross Revenue', value: totalRevenue },
                { label: 'Completion Rate (%)', value: completionRate.toFixed(2) },
                { label: 'Active Guides', value: activeGuides },
                { label: 'Average Booking Value', value: averageBookingValue.toFixed(2) },
            ],
            sheets: [
                {
                    name: 'Trend Data',
                    tableTitle: 'Monthly Booking and Revenue Trend',
                    rows: trendData.map((row) => ({
                        period: row.label,
                        bookings: row.bookings,
                        revenue: row.revenue,
                    })),
                    columns: [
                        { key: 'period', header: 'Period' },
                        { key: 'bookings', header: 'Bookings' },
                        { key: 'revenue', header: 'Revenue (PHP)' },
                    ],
                },
                {
                    name: 'Status Distribution',
                    tableTitle: 'Booking Status Distribution',
                    rows: statusData.map((row) => ({
                        status: row.name,
                        count: row.value,
                    })),
                    columns: [
                        { key: 'status', header: 'Status' },
                        { key: 'count', header: 'Count' },
                    ],
                },
                {
                    name: 'Top Destinations',
                    tableTitle: 'Most Booked Destinations',
                    rows: destinationData.map((row) => ({
                        destination: row.name,
                        bookings: row.count,
                    })),
                    columns: [
                        { key: 'destination', header: 'Destination' },
                        { key: 'bookings', header: 'Bookings' },
                    ],
                },
                {
                    name: 'Booking Details',
                    tableTitle: 'Bookings Included in Analytics Scope',
                    rows: scopedBookings.map((booking) => {
                        const bookingDate = getBookingDate(booking);
                        const touristDisplay = booking?.tourist_username
                            || [booking?.tourist_detail?.first_name, booking?.tourist_detail?.last_name].filter(Boolean).join(' ')
                            || 'Guest';
                        const destinationLabel = booking?.destination_detail?.name || booking?.accommodation_detail?.title || booking?.location || 'Unknown';

                        return {
                            booking_id: booking?.id || '',
                            created_date: booking?.created_at || '',
                            check_in: booking?.check_in || '',
                            check_out: booking?.check_out || '',
                            tourist: touristDisplay,
                            destination: destinationLabel,
                            status: String(booking?.status || '').replace('_', ' '),
                            total_price: toAmount(booking?.total_price),
                            month_bucket: bookingDate ? getMonthLabel(bookingDate) : '',
                        };
                    }),
                    columns: [
                        { key: 'booking_id', header: 'Booking ID' },
                        { key: 'created_date', header: 'Created Date' },
                        { key: 'check_in', header: 'Check In' },
                        { key: 'check_out', header: 'Check Out' },
                        { key: 'tourist', header: 'Tourist' },
                        { key: 'destination', header: 'Destination' },
                        { key: 'status', header: 'Status' },
                        { key: 'total_price', header: 'Total Price (PHP)' },
                        { key: 'month_bucket', header: 'Month Bucket' },
                    ],
                },
            ],
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Analytics</h2>
                    <p className="text-slate-500 dark:text-slate-400">Agency performance insights with booking volume, revenue, and status trends.</p>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                    {TIMEFRAME_OPTIONS.map((option) => (
                        <button
                            key={option.id}
                            onClick={() => setTimeframe(option.id)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                                timeframe === option.id
                                    ? 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleExportAnalyticsReport}
                    disabled={scopedBookings.length === 0}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Download className="w-4 h-4" />
                    Export Excel
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Bookings ({monthsToShow} mo)</p>
                        <BarChart3 className="w-4 h-4 text-cyan-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{scopedBookings.length}</p>
                </div>

                <div className="bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Gross Revenue</p>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">₱ {totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>

                <div className="bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Completion Rate</p>
                        <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{completionRate.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Formula: Completed bookings / Total bookings</p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-0.5">{completedCount} / {scopedBookings.length}</p>
                </div>

                <div className="bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Active Guides</p>
                        <Users className="w-4 h-4 text-violet-500" />
                    </div>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{activeGuides}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Avg booking value: ₱ {averageBookingValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-slate-900 dark:text-white font-bold mb-4">Booking Volume (Bar)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-700" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" tickLine={false} axisLine={false} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" tickLine={false} axisLine={false} />
                                <RechartsTooltip content={<ChartTooltip />} />
                                <Legend />
                                <Bar dataKey="bookings" name="Bookings" fill="#06B6D4" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-slate-900 dark:text-white font-bold mb-4">Revenue Trend (Area)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-700" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickLine={false} axisLine={false} />
                                <RechartsTooltip content={<ChartTooltip />} />
                                <Legend />
                                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" fill="#93C5FD" fillOpacity={0.45} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-slate-900 dark:text-white font-bold mb-4 flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-indigo-500" />
                        Status Distribution
                    </h3>
                    <div className="h-72">
                        {statusData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">No data for selected period.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPieChart>
                                    <Pie
                                        data={statusData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        innerRadius={50}
                                        paddingAngle={3}
                                    >
                                        {statusData.map((entry) => (
                                            <Cell key={`${entry.name}-${entry.value}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<ChartTooltip />} />
                                    <Legend />
                                </RechartsPieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-6">
                    <h3 className="text-slate-900 dark:text-white font-bold mb-4">Top Destinations</h3>
                    <div className="h-72">
                        {destinationData.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">No destinations found for selected period.</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={destinationData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" className="dark:stroke-slate-700" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" tickLine={false} axisLine={false} angle={-20} textAnchor="end" interval={0} height={70} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#64748b" tickLine={false} axisLine={false} />
                                    <RechartsTooltip content={<ChartTooltip />} />
                                    <Bar dataKey="count" name="Bookings" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
