import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ForgotPassword, Home, LandingPage, Login, NotFound, Register } from './pages';
import { AgencyDashboard } from './agency';
import { ProtectedRoute } from './components';

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
                <Route path='/landing_page' element={<LandingPage></LandingPage>}></Route> */}
                <Route path='*' element={<NotFound></NotFound>}></Route>



                {/* AGENCY */}
                <Route path='/agency-dashboard' element={<AgencyDashboard />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App