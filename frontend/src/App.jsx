import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ForgotPassword, LandingPage, Login, NotFound, Register } from './pages';
import { ProtectedRoute } from './components';

const App = () => {
    const Logout = () => {
        return <Navigate to="/login"></Navigate>
    }
    return (
        <BrowserRouter>
            <Routes>
                <Route path='/' element={
                    <ProtectedRoute>
                        <LandingPage></LandingPage>
                    </ProtectedRoute>
                }></Route>
                <Route path='/logout' element={<Logout></Logout>}></Route>
                <Route path='/login' element={<Login></Login>}></Route>
                <Route path='/register' element={<Register></Register>}></Route>
                <Route path='/forgot-password' element={<ForgotPassword></ForgotPassword>}></Route>
                <Route path='*' element={<NotFound></NotFound>}></Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App