import React from "react";
import { NavLink } from "react-router-dom";
import { FiSearch, FiMail, FiUser } from "react-icons/fi";
import { MdOutlineTour } from "react-icons/md";
import { FiSettings } from "react-icons/fi";

const NavigationBar = () => {
    const navItems = [
        { to: "/explore", label: "Explore", icon: <FiSearch className="text-[22px]" /> },
        { to: "/tour-guide", label: "Tour Guide", icon: <MdOutlineTour className="text-[22px]" /> },
        { to: "/messages", label: "Messages", icon: <FiMail className="text-[22px]" /> },
        { to: "/profile", label: "Profile", icon: <FiUser className="text-[22px]" /> },
        // { to: "/settings", label: "Settings", icon: <FiSettings className="text-[22px]" /> },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0C1424] text-white flex justify-around items-center py-1 shadow-lg z-50">
            {navItems.map(({ to, label, icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center text-[10px] cursor-pointer transition-all duration-300 ${isActive ? "text-white" : "text-gray-300"}`}>
                    {
                        ({ isActive }) => (
                            <>
                                <div className={`flex items-center justify-center mb-1 transition-all duration-300 ${isActive ? "w-15 h-15 bg-[#0C1424] rounded-full border-2 border-white mt-[-40px]" : "w-10 h-10"}`}>
                                    {icon}
                                </div>
                                <span>{label}</span>
                            </>
                        )
                    }
                </NavLink>
            ))}
        </nav>
    );
};

export default NavigationBar;
