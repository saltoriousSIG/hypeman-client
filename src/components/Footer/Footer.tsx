import React from "react";
import { NavLink } from "react-router-dom";
import { DollarSign, Plus, Settings } from "lucide-react";

const Footer: React.FC = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/20 z-50">
            <div className="flex items-center">
                <NavLink to="/" className="flex-1">
                    {({ isActive }) => (
                        <button
                            className={`w-full flex items-center justify-center gap-2 px-6 py-6 text-white text-base font-semibold transition-all duration-300 border-r cursor-pointer ${isActive
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 border-white/10 font-bold'
                                : 'bg-white/10 hover:bg-white/20 border-white/10'
                                }`}
                        >
                            <DollarSign className="w-5 h-5" />
                            Earn
                        </button>
                    )}
                </NavLink>
                <NavLink to="/creators" className="flex-1">
                    {({ isActive }) => (
                        <button
                            className={`w-full flex items-center justify-center gap-2 px-6 py-6 text-white text-base font-semibold transition-all duration-300 border-r cursor-pointer ${isActive
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 border-white/10 font-bold'
                                : 'bg-white/10 hover:bg-white/20 border-white/10'
                                }`}
                        >
                            <Plus className="w-5 h-5" />
                            Promote
                        </button>
                    )}
                </NavLink>
                <NavLink to="/manage" className="flex-1">
                    {({ isActive }) => (
                        <button
                            className={`w-full flex items-center justify-center gap-2 px-6 py-6 text-white text-base font-semibold transition-all duration-300 cursor-pointer ${isActive
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 font-bold'
                                : 'bg-white/10 hover:bg-white/20'
                                }`}
                        >
                            <Settings className="w-5 h-5" />
                            Manage
                        </button>
                    )}
                </NavLink>
            </div>
        </div>

    );
}

export default Footer;