import React, { useState, useEffect } from 'react';
import { Star, User, MessageSquare, Filter } from 'lucide-react';
import api from '../../api/api';

export default function AgencyReviews() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterRating, setFilterRating] = useState('all');

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const res = await api.get('api/reviews/');
            setReviews(res.data);
        } catch (error) {
            console.error("Failed to fetch reviews:", error);
        } finally {
            setLoading(false);
        }
    };

    const getAverageRating = () => {
        if (reviews.length === 0) return 0;
        const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
        return (sum / reviews.length).toFixed(1);
    };

    const filteredReviews = filterRating === 'all'
        ? reviews
        : reviews.filter(r => r.rating === parseInt(filterRating));

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6 transition-colors duration-300">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-500/20 rounded-full flex items-center justify-center border border-yellow-100 dark:border-transparent">
                            <Star className="w-6 h-6 text-yellow-500 dark:text-yellow-500 fill-yellow-500 dark:fill-yellow-500" />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Average Rating</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{getAverageRating()}</h3>
                        </div>
                    </div>
                </div>

                <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-100 dark:border-transparent">
                            <MessageSquare className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Reviews</p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{reviews.length}</h3>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700/50 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-transparent">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Guest Feedback</h3>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <select
                            value={filterRating}
                            onChange={(e) => setFilterRating(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-300 text-sm font-medium focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 cursor-pointer appearance-none min-w-[150px] transition-colors"
                        >
                            <option value="all">All Ratings</option>
                            <option value="5">5 Stars</option>
                            <option value="4">4 Stars</option>
                            <option value="3">3 Stars</option>
                            <option value="2">2 Stars</option>
                            <option value="1">1 Star</option>
                        </select>
                    </div>
                </div>

                <div className="divide-y divide-slate-200 dark:divide-slate-700/50 bg-white dark:bg-transparent">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">Loading reviews...</div>
                    ) : filteredReviews.length > 0 ? (
                        filteredReviews.map((review) => (
                            <div key={review.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-transparent">
                                            <User className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-slate-900 dark:text-white font-bold">{review.reviewer_username}</h4>
                                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">reviewed</span>
                                                <span className="text-cyan-600 dark:text-cyan-400 font-bold text-sm">{review.reviewed_user_username}</span>
                                            </div>
                                            <div className="flex items-center gap-1 mb-2">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-500 text-yellow-500 dark:fill-yellow-500 dark:text-yellow-500' : 'text-slate-300 dark:text-slate-600'}`}
                                                    />
                                                ))}
                                                <span className="text-slate-500 dark:text-slate-400 text-xs font-medium ml-2">
                                                    {formatDate(review.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed font-medium">
                                                "{review.comment}"
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-500 font-mono font-bold bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-transparent">
                                        Booking #{review.booking}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">
                            No reviews found matching your criteria.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}