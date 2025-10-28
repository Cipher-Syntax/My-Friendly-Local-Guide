import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import LoginBackground from '../assets/login_background.png';
import RegisterBackground from '../assets/register_background.png';
import { FcGoogle } from "react-icons/fc";
import api from '../api/api';

const Form = ({ route, method }) => {
    const { register, handleSubmit, setValue, formState: { errors, isSubmitting },} = useForm();

    const [error, setError] = useState('');
    const [remembered, setRemembered] = useState(false);
    const navigate = useNavigate();

    const status = method === 'login' ? 'Welcome Back Adventurer' : 'Join The Adventure';
    const bgImage = method === 'login' ? LoginBackground : RegisterBackground;

    const onSubmit = async (data) => {
        try{
            await api.post(route, data, {withCredentials: true});
            // console.log(response.data)
            if(method === "login"){
                if(remembered){
                    localStorage.setItem("rememberedUsername", data.username);
                } else {
                    localStorage.removeItem("rememberedUsername");
                }
                localStorage.setItem('user', data.username);
                navigate('/');
            }
            else{
                navigate("/login");
            }
        }
        catch(error){
            if(error.response){
                if(error.response.status === 401){
                    const errorDetail = error.response.data.detail

                    if(errorDetail === "No active account found with the given credentials"){
                        setError('Invalid username or password')
                    }
                    else{
                        console.log(errorDetail)
                    }
                }
                else if(error.response.status === 400){
                    if(error.response.data.username){
                        setError(error.response.data.username[0])
                    }
                    else{
                        setError('Something went wrong')
                    }
                }
                else{
                    setError('Network error. Please try again')
                }
            }
        }
    }


    useEffect(() => {
        if(error){
            const timer = setTimeout(() => setError(""), 2000)
            return () => clearTimeout(timer)
        }
    }, [error])

    useEffect(() => {
        const savedUsername = localStorage.getItem("rememberedUsername");
        if (savedUsername) {
            setRemembered(true);
            setValue("username", savedUsername);
        }
    }, []);

    return (
        <div className="flex flex-col min-h-screen">
            <div
                className="h-[50vh] bg-cover bg-center flex items-center justify-center"
                style={{
                backgroundImage: `url(${bgImage})`,
                backgroundRepeat: 'no-repeat',
                }}
            >
            </div>

            <div className="flex-1 bg-[#D9E2E9] rounded-t-[40px] shadow-lg mt-[-40px] p-8 flex flex-col items-center justify-center">
                <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md flex flex-col gap-4">
                    <h1 className="mt-10 text-[20px] md:text-4xl font-extrabold drop-shadow-md text-center bg-gradient-to-r from-[#0F172A] to-[#007AAD] bg-clip-text text-transparent leading-relaxed tracking-wide">
                        {status}
                    </h1>

                    {
                        error && (
                            <p className="text-red-500 text-center text-[10px] mt-2">{error}</p>
                        )
                    }

                    <input
                        type="text"
                        placeholder="Username"
                        {...register('username', { required: 'Username is required' })}
                        className="border border-[#0F172A] placeholder:text-[12px] rounded-lg p-2 text-[12px] h-10 focus:outline-none focus:border-[#0F172A]"
                    />
                    {errors.username && (
                        <p className="text-red-500 text-[10px]">{errors.username.message}</p>
                    )}

                    {method === 'register' && (
                        <>
                            <input
                                type="email"
                                placeholder="Email"
                                {...register('email', { required: 'Email is required' })}
                                className="border 0 border-[#0F172A] placeholder:text-[12px] rounded-lg p-2 text-[12px] h-10 focus:outline-none focus:border-[#0F172A]"
                            />
                            {errors.email && (
                                <p className="text-red-500 text-[10px]">{errors.email.message}</p>
                            )}
                        </>
                    )}

                    <input
                        type="password"
                        placeholder="Password"
                        {...register('password', { required: 'Password is required' })}
                        className="border border-[#0F172A] placeholder:text-[12px] rounded-lg p-2 text-[12px] h-10 focus:outline-none focus:border-[#0F172A]"
                    />
                    {errors.password && (
                        <p className="text-red-500 text-[10px]">{errors.password.message}</p>
                    )}

                    {method === 'register' && (
                        <>
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                {...register('confirm_password', {
                                required: 'Please confirm your password',
                                validate: (value, { password }) =>
                                    value === password || 'Passwords do not match',
                                })}
                                className="border border-[#0F172A] placeholder:text-[12px] rounded-lg p-2 text-[12px] h-10 focus:outline-none focus:border-[#0F172A]"
                            />
                            {errors.confirm_password && (
                                <p className="text-red-500 text-[10px]">
                                {errors.confirm_password.message}
                                </p>
                            )}
                        </>
                    )}

                    {
                        method === "login" && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="remember"
                                        checked={remembered}
                                        onChange={(e) => setRemembered(e.target.checked)}
                                        className="w-3 h-3 rounded cursor-pointer accent-[#0F172A]"
                                    />
                                    <label htmlFor="remember" className="text-[12px] text-gray-600 cursor-pointer">
                                        Keep me signed in
                                    </label>
                                </div>
                                <Link to="/forgot-password" className="text-[12px] underline text-[#0F172A] font-medium">
                                    Forgot?
                                </Link>
                            </div>
                        )
                    }

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="drop-shadow-lg bg-gradient-to-r from-[#00C6FF] to-[#0072FF] hover:bg-blue-700 text-white font-semibold py-2  rounded-lg transition-colors"
                    >
                        {method === 'login' ? 'Login' : 'Register'}
                    </button>

                    {
                        method === "login" ? (
                            <div className="mt-3 pt-3">
                                <p className="text-center text-gray-600 text-[12px]">
                                    New to LocaLynk?{" "}
                                    <Link to="/register" className="bg-gradient-to-r from-[#0F172A] to-[#007AAD] bg-clip-text text-transparent font-bold hover:text-[#007AAD] transition-colors">
                                        Create an account
                                    </Link>
                                </p>
                            </div>
                        ) : (
                            <div className="mt-3 pt-3">
                                <p className="text-center text-gray-600 text-[12px]">
                                    Already have an account?{" "}
                                    <Link to="/login" className="bg-gradient-to-r from-[#0F172A] to-[#007AAD] bg-clip-text text-transparent font-bold hover:text-[#007AAD] transition-colors">
                                        Login
                                    </Link>
                                </p>
                            </div>
                        )
                    }
                </form>
                
                <div className="w-full max-w-md mt-6">
                    <div className="flex items-center justify-center gap-3">
                        <hr className="flex-1 border-[#0F172A]" />
                        <p className="text-gray-700 text-[12px]">or</p>
                        <hr className="flex-1 border-[#0F172A] " />
                    </div>

                    <button
                        type="button"
                        className="mt-4 w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2 hover:bg-gray-100 transition-colors"
                        onClick={() => console.log("Sign in with Google")}
                    >
                        <FcGoogle size={20} />
                        <span className="text-gray-700 text-sm font-medium">
                        Continue with Google
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Form;
