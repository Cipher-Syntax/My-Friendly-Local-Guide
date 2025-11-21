import React, { useState, useMemo } from 'react';
import { Calendar, Users, Star, TrendingUp, Clock, MapPin, User, Plus, Search, Phone, Mail, Award, CheckCircle, UserX } from 'lucide-react';
import { DashboardStats, BookingsList, TourGuideList } from '../components/agency';
import AgencyHeader from '../assets/agencyHeader.png';
import { Link } from 'react-router-dom';
import { useAgencyDashboardOverview } from '../hooks/useAgencyDashboardOverview';

export default function AgencyDashboard() {
    const {
        bookings,
        tourGuides,
        searchTerm,
        setSearchTerm,
        selectedBookingId,
        setSelectedBookingId,
        getStatusBg,
        getStatusColor,
        getGuideNames,
        filteredGuides,
        currentSelectedBooking,
        assignGuide,
    } = useAgencyDashboardOverview();

    // --- Render ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <Link to="/agency-draft">Agency Draft</Link>
            <header className='w-[100%]'>
                <div className="w-[100%] mx-auto px-6 py-4" style={{
                    backgroundImage: `url(${AgencyHeader})`,
                    objectFit: "cover",
                    backgroundRepeat: "no-repeat"
                }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white">Agency Dashboard</h1>
                            <p className="text-slate-400 text-sm mt-1">Manage your tour bookings and guides</p>
                        </div>
                        {/* <div className="flex items-center gap-4">
                            <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
                                New Booking
                            </button>
                            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                            </div>
                        </div> */}
                    </div>
                </div>
            </header >

            {/* Hero Banner */}
            <div className="relative h-32 text-center overflow-hidden flex items-center justify-center">
                <div className="relative max-w-[1800px] mx-auto px-6 h-full flex items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-1">TOUR GUIDES & BOOKINGS</h2>
                        <p className="text-white/80">Overview of all activities</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-[1800px] mx-auto px-6 py-8">
                {/* Stats Grid - CALLING DashboardStats */}
                <DashboardStats tourGuides={tourGuides} />

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Bookings Section - CALLING BookingsList */}
                    <BookingsList
                        bookings={bookings}
                        selectedBookingId={selectedBookingId}
                        setSelectedBookingId={setSelectedBookingId}
                        getGuideNames={getGuideNames}
                        getStatusBg={getStatusBg}
                        getStatusColor={getStatusColor}
                    />

                    {/* Tour Guides Section - CALLING TourGuideList */}
                    <TourGuideList
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        filteredGuides={filteredGuides}
                        currentSelectedBooking={currentSelectedBooking}
                        selectedBookingId={selectedBookingId}
                        assignGuide={assignGuide}
                    />
                </div>
            </div>
        </div >
    );
}