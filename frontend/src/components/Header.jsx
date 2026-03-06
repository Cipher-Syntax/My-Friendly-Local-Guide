import React from 'react';
import { RiMenu2Fill } from "react-icons/ri";
import { CiSearch } from "react-icons/ci";
import { MdDarkMode, MdLightMode } from "react-icons/md";
import { Slide } from 'react-slideshow-image';
import "react-slideshow-image/dist/styles.css";
import LoginBackground from '../assets/login_background.png';
import RegisterBackground from '../assets/register_background.png';
import { Link } from 'react-router-dom';
import { IoIosArrowRoundForward } from "react-icons/io";
import { useTheme } from '../context/ThemeContext';

const Header = () => {
    const { theme, toggleTheme } = useTheme();

    const dataSlider = [
        { id: 1, image: LoginBackground, logo: "DISCOVER NATURE’S SERENITY! ", name: "MUTI, GRASSLAND", description: "Nestled in the heart of nature, Muti Grassland offers a breathtaking escape into rolling green hills and open skies. Perfect for hiking, sightseeing, or simply unwinding, this serene landscape invites you to explore the untouched beauty of Zamboanga’s countryside. Feel the breeze, embrace the calm, and discover nature at its finest!" },

        { id: 2, image: RegisterBackground, logo: "DISCOVER COASTAL TRANQUILITY!", name: "BOLONG BEACH", description: "Breathe in the sea breeze and let your worries drift away at Bolong Beach — where calm waters meet golden sands. Whether you’re up for a quiet morning stroll, a refreshing swim, or simply soaking in the horizon, this serene coastal gem captures the tranquil charm of Zamboanga’s shores. Relax, explore, and let nature’s peace surround you." },

        { id: 3, image: RegisterBackground, logo: "DISCOVER SUNSET BLISS!", name: "ZAMBOANGA CITY, BOULEVARD", description: "Watch the sky come alive at Zamboanga’s Boulevard, where every sunset paints a masterpiece over calm waves and golden sands. Stroll along the shore, enjoy the sea breeze, and take in the vibrant evening glow that makes this coastal spot a local favorite. Relax, unwind, and let the rhythm of the ocean soothe your soul." },
    ];

    return (
        <div className="relative overflow-hidden">
            <div className="absolute top-0 left-0 z-50 w-full flex items-center justify-between gap-x-2 p-5 text-gray-800 dark:text-gray-100 transition-colors duration-300">
                <RiMenu2Fill size={24} className="cursor-pointer drop-shadow-md text-white dark:text-gray-200" />

                <div className="flex items-center gap-x-3 w-full justify-end">
                    {/* Search Bar */}
                    <div className="flex items-center justify-between gap-x-2 outline-1 bg-[#D9E2E9] dark:bg-gray-800/90 backdrop-blur-sm p-1.5 rounded-full px-3 transition-colors duration-300 w-full max-w-[200px] shadow-sm">
                        <CiSearch className="text-gray-600 dark:text-gray-300" size={18} />
                        <input
                            type="search"
                            placeholder="Find place..."
                            className="bg-transparent outline-0 w-full placeholder:text-gray-500 dark:placeholder:text-gray-400 text-gray-800 dark:text-white focus:outline-0 text-[14px]"
                        />
                    </div>

                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md text-gray-800 dark:text-gray-200 hover:scale-105 transition-all"
                        aria-label="Toggle Theme"
                    >
                        {theme === 'dark' ? <MdLightMode size={20} /> : <MdDarkMode size={20} />}
                    </button>
                </div>
            </div>

            <Slide duration={4000} transitionDuration={800} infinite indicators autoplay>
                {dataSlider.map((imageSlider) => (
                    <div key={imageSlider.id}>
                        <div
                            className='rounded-b-[35px] object-top'
                            style={{
                                backgroundImage: `url(${imageSlider.image})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                height: "330px",
                                width: "100%",
                            }}
                        >
                            {/* Overlay for better text readability in both modes */}
                            <div className='w-full h-full bg-black/20 dark:bg-black/40 rounded-b-[35px]'>
                                <div className='px-4 flex items-start pt-28 pb-6 flex-col h-full justify-end'>
                                    <h1 className='bg-gradient-to-r from-[#FFFFFF] to-[#00C6FF] bg-clip-text text-transparent leading-relaxed tracking-wide font-bold text-[20px] drop-shadow-md'>{imageSlider.logo}</h1>
                                    <h3 className='bg-gradient-to-r from-[#FFFFFF] to-[#00C6FF] bg-clip-text text-transparent leading-relaxed font-light text-[18px] w-full drop-shadow-md'>{imageSlider.name}</h3>
                                    <p className='text-[10px] font-light text-white drop-shadow-md mt-1'>{imageSlider.description.slice(0, 150) + "..."}</p>

                                    <Link className='text-white flex items-center gap-x-1 text-[12px] mt-4 font-medium hover:text-[#00C6FF] transition-colors'>
                                        <p>Explore Now</p>
                                        <IoIosArrowRoundForward size={16} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </Slide>
        </div>
    );
};

export default Header;