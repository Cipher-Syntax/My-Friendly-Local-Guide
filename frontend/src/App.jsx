// src/App.jsx

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
import ReportsAndAnalysis from './components/admin/ReportsAndAnalysis';
import Settings from './components/admin/Settings';

import AgencyProfileCompletion from './pages/AgencyProfileCompletion';

const App = () => {
    const Logout = () => {
        return <Navigate to="/login"></Navigate>
    }
    return (
        <BrowserRouter>
            <Routes>
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


                <Route path='/agency' element={<AgencyLayout />} />
                
                <Route path='/agency/complete-profile' element={<ProtectedRoute><AgencyProfileCompletion /></ProtectedRoute>} />
                
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

                <Route path='/admin-signin' element={<Adminsignin />} />
                <Route path='/agency-signin' element={<Agencysignin />} />
                <Route path='/agency-register' element={<AgencyRegister />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App