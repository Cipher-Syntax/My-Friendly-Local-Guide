import React from "react";
import { NavLink } from "react-router-dom";
import { FiSearch, FiMail, FiUser } from "react-icons/fi";
import { MdOutlineTour } from "react-icons/md";

const NavigationBar = () => {
    const navItems = [
        { to: "/explore", label: "Explore", icon: <FiSearch size={22} /> },
        { to: "/tour-guide", label: "Tour Guide", icon: <MdOutlineTour size={22} /> },
        { to: "/messages", label: "Messages", icon: <FiMail size={22} /> },
        { to: "/profile", label: "Profile", icon: <FiUser size={22} /> },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0C1424] text-white flex justify-around items-center py-2 shadow-lg z-50">
            {navItems.map(({ to, label, icon }) => (
                <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 text-[11px] transition-all duration-300 ${
                    isActive ? "text-white font-semibold" : "text-gray-400"
                    }`
                }
                >
                {({ isActive }) => (
                    <>
                    <div
                        className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                        isActive
                            ? "bg-[#1A2238] p-3 border border-white scale-110"
                            : "p-2"
                        }`}
                    >
                        {icon}
                    </div>
                    <span>{label}</span>
                    </>
                )}
                </NavLink>
            ))}
        </nav>
    );
};

export default NavigationBar;
