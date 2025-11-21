import React from 'react';
import BackgroundImage from '../assets/background_image.png';
import { Link } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div
            className="relative flex flex-1 items-center justify-center w-screen min-h-screen bg-cover bg-center"
            style={{ backgroundImage: `url(${BackgroundImage})` }}
        >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
                <h1 className="text-[28px] md:text-5xl absolute bottom-90 font-bold bg-gradient-to-r from-white to-blue-500 bg-clip-text text-transparent">
                    DISCOVER WITH LOCALS!
                </h1>

                <p className="text-white text-[14px] absolute bottom-80 md:text-lg mb-4 leading-relaxed tracking-wide mt-[-15px]">
                    Your gateway to authentic journeys
                </p>

                {/* --- TWO BUTTONS HORIZONTAL --- */}
                <div className="absolute bottom-10 sm:bottom-30 flex gap-4">
                    <Link to="/admin-signin" className="w-40 h-12 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center">
                        <span className="text-white text-sm md:text-base font-semibold uppercase cursor-pointer">
                            Admin
                        </span>
                    </Link>

                    <Link to="agency-signin" className="w-40 h-12 rounded-full bg-green-600 hover:bg-green-700 transition-colors flex items-center justify-center">
                        <span className="text-white text-sm md:text-base font-semibold uppercase cursor-pointer">
                            Agency
                        </span>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
