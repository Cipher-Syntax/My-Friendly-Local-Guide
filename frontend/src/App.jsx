import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ForgotPassword, Home, LandingPage, Login, NotFound, Register } from './pages';
import { ProtectedRoute } from './components';
import { AgencyLayout, AgencyDashboard, Agencysignin, AgencyRegister } from './agency';
import { Adminsignin } from './admin';

import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import AgencyManagement from './components/admin/AgencyManagement';
import TourGuidesManagement from './components/admin/TourGuidesManagement';
import ContentManagement from './components/admin/ContentManagement';
import Settings from './components/admin/Settings';
import PaymentsManagement from './components/admin/PaymentsManagement';

import ReportsAndAnalysis from './components/admin/ReportsAndAnalysis';
import Feedback from './components/admin/Feedback';
import AllBookings from './components/admin/AllBookings'; // Import the new component

import AgencyProfileCompletion from './pages/AgencyProfileCompletion';

const App = () => {
    const Logout = () => {
        return <Navigate to="/login"></Navigate>
    }
    return (
        <BrowserRouter>
            <Routes>
                <Route path='*' element={<NotFound></NotFound>}></Route>

                <Route path='/agency' element={<AgencyLayout />} />
                <Route path='/agency/complete-profile' element={<ProtectedRoute><AgencyProfileCompletion /></ProtectedRoute>} />

                <Route path='/' element={<LandingPage />} />

                {/* Admin Routes */}
                <Route path='/admin' element={
                    <ProtectedRoute>
                        <AdminLayout />
                    </ProtectedRoute>
                }>
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="bookings" element={<AllBookings />} /> {/* Added Route */}
                    <Route path="agency" element={<AgencyManagement />} />
                    <Route path="guides" element={<TourGuidesManagement />} />
                    <Route path="payments" element={<PaymentsManagement />} />
                    <Route path="content" element={<ContentManagement />} />
                    <Route path="settings" element={<Settings />} />

                    <Route path="analytics" element={<ReportsAndAnalysis />} />
                    <Route path="feedback" element={<Feedback />} />
                </Route>

                <Route path='/admin-signin' element={<Adminsignin />} />
                <Route path='/agency-signin' element={<Agencysignin />} />
                <Route path='/agency-register' element={<AgencyRegister />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App