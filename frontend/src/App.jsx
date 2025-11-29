import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ForgotPassword, Home, LandingPage, Login, NotFound, Register } from './pages';
import { ProtectedRoute } from './components';
import { AgencyLayout, AgencyDashboard, Agencysignin } from './agency'; // Updated import for AgencyLayout
import { Adminsignin } from './admin';

// Import the modular admin components
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './components/admin/Dashboard';
import AgencyManagement from './components/admin/AgencyManagement';
import TourGuidesManagement from './components/admin/TourGuidesManagement';
import UserManagement from './components/admin/UserManagement';
import ContentManagement from './components/admin/ContentManagement';
import AccommodationManagement from './components/admin/AccommodationManagement';
import ReportsAndAnalysis from './components/admin/ReportsAndAnalysis';
import Settings from './components/admin/Settings';

const App = () => {
    const Logout = () => {
        return <Navigate to="/login"></Navigate>
    }
    return (
        <BrowserRouter>
            <Routes>
                {/* User/Guest Routes (commented out for now as per previous context) */}
                {/* <Route path='/' element={
                    <ProtectedRoute>
                        <Home></Home>
                    </ProtectedRoute>
                }></Route>
                <Route path='/logout' element={<Logout></Logout>}></Route>
                <Route path='/login' element={<Login></Login>}></Route>
                <Route path='/register' element={<Register></Register>}></Route>
                <Route path='/forgot-password' element={<ForgotPassword></ForgotPassword>}></Route>
                <Route path='/landing_page' element={'<LandingPage></LandingPage>'}></Route> */}
                <Route path='*' element={<NotFound></NotFound>}></Route>


                {/* AGENCY ROUTES */}
                {/* <Route path='/agency-dashboard' element={<AgencyDashboard />} /> */}
                <Route path='/agency' element={<AgencyLayout />} />
                
                <Route path='/' element={<LandingPage />} />
                <Route path='/admin' element={
                    <ProtectedRoute>
                        <AdminLayout />
                    </ProtectedRoute>
                    
                }>
                    <Route index element={<Dashboard />} />
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="agency" element={<AgencyManagement />} />
                    <Route path="guides" element={<TourGuidesManagement />} />
                    {/* <Route path="users" element={<UserManagement />} /> */}
                    <Route path="content" element={<ContentManagement />} />
                    {/* <Route path="accommodation" element={<AccommodationManagement />} /> */}
                    <Route path="reports" element={<ReportsAndAnalysis />} />
                    <Route path="settings" element={<Settings />} />
                </Route>

                {/* SIGN IN PAGES */}
                <Route path='/admin-signin' element={<Adminsignin />} />
                <Route path='/agency-signin' element={<Agencysignin />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App