import React from "react";
import { NavLink } from "react-router-dom";
import { Volume2, Plus, Settings } from "lucide-react";

const Footer: React.FC = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/20 z-50">
            <div className="flex items-center">
                <NavLink to="/" className="flex-1">
                    {({ isActive }) => (
                        <button
                            className={`w-full flex items-center flex-col gap-1 px-6 py-6 text-sm font-semibold transition-all duration-300 border-r cursor-pointer border-white/10 ${isActive
                                ? 'text-pink-400'
                                : 'text-white hover:bg-white/20'
                                }`}
                        >
                            <Volume2 className="w-5 h-5" />
                            Hype
                        </button>
                    )}
                </NavLink>
                <NavLink to="/creators" className="flex-1">
                    {({ isActive }) => (
                        <button
                            className={`w-full flex items-center flex-col gap-1 px-6 py-6 text-sm font-semibold transition-all duration-300 border-r cursor-pointer border-white/10 ${isActive
                                ? 'text-pink-400'
                                : 'text-white hover:bg-white/20'
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
                            className={`w-full flex items-center flex-col gap-1 px-6 py-6 text-sm font-semibold transition-all duration-300 cursor-pointer ${isActive
                                ? 'text-pink-400'
                                : 'text-white hover:bg-white/20'
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