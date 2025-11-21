import React from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAgencyDashboardData } from '../hooks/useAgencyDashboardData';
import AgencyHeaderImage from '../assets/agencyHeader.png'; // Assuming this is needed for the header
import { Link } from 'react-router-dom'; // Keep Link for any external navigation
import { LayoutDashboard, BookOpen, UsersRound } from 'lucide-react'; // Added missing imports

// Import modular components
import AgencySidebar from '../components/agency/AgencySidebar';
import AgencyDashboardContent from '../components/agency/AgencyDashboardContent';
import AgencyBookingsTable from '../components/agency/AgencyBookingsTable';
import AgencyTourGuideManagement from '../components/agency/AgencyTourGuideManagement';
import ManageGuidesModal from '../components/agency/ManageGuidesModal';
import AddGuideModal from '../components/agency/AddGuideModal';
import DeleteConfirmationModal from '../components/agency/DeleteConfirmationModal';

export default function AgencyLayout() {
    const {
        activeTab,
        setActiveTab,
        isModalOpen,
        setIsModalOpen,
        isAddGuideModalOpen,
        setIsAddGuideModalOpen,
        isDeleteConfirmOpen,
        setIsDeleteConfirmOpen,
        guideToDelete,
        setGuideToDelete,
        selectedBookingId,
        setSelectedBookingId,
        searchTerm,
        setSearchTerm,
        newGuideForm,
        setNewGuideForm,
        bookings,
        setBookings,
        tourGuides,
        setTourGuides,
        getGuideNames,
        filteredGuides,
        currentSelectedBooking,
        filteredFormLanguages,
        activeGuides,
        completedTours,
        avgRating,
        getStatusBg,
        assignGuide,
        updateBookingStatus,
        openManageGuidesModal,
        closeModal,
        openAddGuideModal,
        closeAddGuideModal,
        handleAddLanguage,
        handleRemoveLanguage,
        handleSubmitNewGuide,
        handleRemoveGuide,
        confirmDeleteGuide,
        cancelDeleteGuide,
        handleSignOut,
    } = useAgencyDashboardData();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
            {/* Sidebar Navigation */}
            <AgencySidebar 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                handleSignOut={handleSignOut} 
                // Pass any other necessary props from useAgencyDashboardData to Sidebar
            />

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <header className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
                    <div className="relative h-48 bg-gradient-to-r from-cyan-600 to-blue-600 overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-20">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400 rounded-full blur-3xl"></div>
                        </div>
                        
                        {/* Header Content */}
                        <div className="relative px-8 py-6 h-full flex flex-col justify-center">
                            <div className="flex items-center gap-4">
                                {/* Icon for each tab */}
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                                    {activeTab === 'dashboard' && <LayoutDashboard className="w-8 h-8 text-white" />}
                                    {activeTab === 'bookings' && <BookOpen className="w-8 h-8 text-white" />}
                                    {activeTab === 'guides' && <UsersRound className="w-8 h-8 text-white" />}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-bold text-white">
                                        {activeTab === 'dashboard' && 'Dashboard Overview'}
                                        {activeTab === 'bookings' && 'Bookings Management'}
                                        {activeTab === 'guides' && 'Tour Guide Management'}
                                    </h2>
                                    <p className="text-cyan-100 mt-1">
                                        {activeTab === 'dashboard' && 'Monitor your agency performance and statistics'}
                                        {activeTab === 'bookings' && 'Manage and assign tour guides to bookings'}
                                        {activeTab === 'guides' && 'View and manage your tour guide roster'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {activeTab === 'dashboard' && (
                        <AgencyDashboardContent 
                            activeGuides={activeGuides}
                            completedTours={completedTours}
                            avgRating={avgRating}
                            tourGuides={tourGuides}
                            bookings={bookings}
                            getStatusBg={getStatusBg}
                        />
                    )}
                    
                    {activeTab === 'bookings' && (
                        <AgencyBookingsTable 
                            bookings={bookings}
                            getGuideNames={getGuideNames}
                            getStatusBg={getStatusBg}
                            updateBookingStatus={updateBookingStatus}
                            openManageGuidesModal={openManageGuidesModal}
                        />
                    )}

                    {activeTab === 'guides' && (
                        <AgencyTourGuideManagement 
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            filteredGuides={filteredGuides}
                            openAddGuideModal={openAddGuideModal}
                            handleRemoveGuide={handleRemoveGuide}
                            getStatusBg={getStatusBg} // assuming needed for guide cards
                        />
                    )}
                </div>
            </div>

            {/* Modals */}
            <ManageGuidesModal 
                isModalOpen={isModalOpen}
                closeModal={closeModal}
                currentSelectedBooking={currentSelectedBooking}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filteredGuides={filteredGuides}
                assignGuide={assignGuide}
                selectedBookingId={selectedBookingId}
            />
            
            <AddGuideModal 
                isAddGuideModalOpen={isAddGuideModalOpen}
                closeAddGuideModal={closeAddGuideModal}
                newGuideForm={newGuideForm}
                setNewGuideForm={setNewGuideForm}
                handleAddLanguage={handleAddLanguage}
                handleRemoveLanguage={handleRemoveLanguage}
                filteredLanguages={filteredFormLanguages}
                handleSubmitNewGuide={handleSubmitNewGuide}
            />

            <DeleteConfirmationModal 
                isDeleteConfirmOpen={isDeleteConfirmOpen}
                cancelDeleteGuide={cancelDeleteGuide}
                confirmDeleteGuide={confirmDeleteGuide}
            />
        </div>
    );
}