import React from 'react';
import BackgroundImage from '../assets/background_image.png';

const LandingPage = () => {
  return (
        <div className="relative flex flex-1 items-center justify-center w-screen min-h-screen bg-cover bg-center" style={{ backgroundImage: `url(${BackgroundImage})` }} >
            <div className="flex flex-col items-center justify-center gap-3 text-center">
                <h1 className="text-[28px] md:text-5xl absolute bottom-90 font-bold bg-gradient-to-r from-white to-blue-500 bg-clip-text text-transparent">
                    DISCOVER WITH LOCALS!
                </h1>

                <p className="text-white text-[14px] absolute bottom-80 md:text-lg mb-4 leading-relaxed tracking-wide mt-[-15px]">
                    Your gateway to authentic journeys
                </p>

                <button className="absolute bottom-10 sm:bottom-30 w-48 h-12 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors flex items-center justify-center">
                    <span className="text-white text-sm md:text-base font-semibold uppercase cursor-pointer">
                        Travel Now
                    </span>
                </button>
            </div>
        </div>
    );
};

export default LandingPage;
