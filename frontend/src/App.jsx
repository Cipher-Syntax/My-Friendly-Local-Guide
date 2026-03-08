import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ForgotPassword, ResetPassword, Home, LandingPage, Login, NotFound, Register } from './pages';
import Portal from './pages/Portal'; // Imported the new Portal component
import { ProtectedRoute } from './components';
import { AgencyLayout, AgencyDashboard, AgencySignin, AgencyRegister } from './agency';
import { Adminsignin } from './admin';

import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import AgencyManagement from './components/admin/AgencyManagement';
import TourGuidesManagement from './components/admin/TourGuidesManagement';
import UsersManagement from './components/admin/UsersManagement'; // Added missing import
import ContentManagement from './components/admin/ContentManagement';
import Settings from './components/admin/Settings';
import PaymentsManagement from './components/admin/PaymentsManagement';
import ArchivedAccounts from './components/admin/ArchivedAccounts';

import ReportsAndAnalysis from './components/admin/ReportsAndAnalysis';
import Feedback from './components/admin/Feedback';
import AllBookings from './components/admin/AllBookings';

import AgencyProfileCompletion from './pages/AgencyProfileCompletion';
import { ThemeProvider } from './context/ThemeContext';

const App = () => {
    const Logout = () => {
        return <Navigate to="/login"></Navigate>
    }

    return (
        <ThemeProvider>
            <BrowserRouter>
                <Routes>
                    <Route path='*' element={<NotFound></NotFound>}></Route>

                    <Route path='/agency' element={<AgencyLayout />} />
                    <Route path='/agency/complete-profile' element={<ProtectedRoute><AgencyProfileCompletion /></ProtectedRoute>} />

                    {/* New Promotional Landing Page is now the root */}
                    <Route path='/' element={<LandingPage />} />

                    {/* The old landing page is now moved to the /portal route */}
                    <Route path='/portal' element={<Portal />} />

                    {/* Password Reset Routes */}
                    <Route path='/forgot-password' element={<ForgotPassword />} />
                    <Route path='/reset-password' element={<ResetPassword />} />

                    {/* Admin Routes */}
                    <Route path='/admin' element={
                        <ProtectedRoute>
                            <AdminLayout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="dashboard" element={<Dashboard />} />
                        <Route path="users" element={<UsersManagement />} /> {/* Added the users route */}
                        <Route path="bookings" element={<AllBookings />} />
                        <Route path="agency" element={<AgencyManagement />} />
                        <Route path="guides" element={<TourGuidesManagement />} />
                        <Route path="payments" element={<PaymentsManagement />} />
                        <Route path="content" element={<ContentManagement />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="archived" element={<ArchivedAccounts />} />

                        <Route path="analytics" element={<ReportsAndAnalysis />} />
                        <Route path="feedback" element={<Feedback />} />
                    </Route>

                    <Route path='/admin-signin' element={<Adminsignin />} />
                    <Route path='/agency-signin' element={<AgencySignin />} />
                    <Route path='/agency-register' element={<AgencyRegister />} />
                </Routes>
            </BrowserRouter>
        </ThemeProvider>
    )
}

export default App