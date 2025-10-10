import React from "react";
import { NavLink } from "react-router-dom";
import { Zap, Plus } from "lucide-react";

const Footer: React.FC = () => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/20 z-50">
            <div className="px-6 py-4">
                <div className="flex items-center justify-center gap-3">
                    <NavLink to="/">
                        {({ isActive }) => (
                            <button 
                                className={`flex items-center gap-2 px-4 py-3 rounded-full text-white text-sm font-semibold transition-all duration-300 border ${
                                    isActive 
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 border-transparent font-bold' 
                                        : 'bg-white/10 hover:bg-white/20 border-white/10'
                                }`}
                            >
                                <Zap className="w-4 h-4" />
                                Browse
                            </button>
                        )}
                    </NavLink>
                    <NavLink to="/creators">
                        {({ isActive }) => (
                            <button 
                                className={`flex items-center gap-2 px-4 py-3 rounded-full text-white text-sm font-semibold transition-all duration-300 border ${
                                    isActive 
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25 border-transparent font-bold' 
                                        : 'bg-white/10 hover:bg-white/20 border-white/10'
                                }`}
                            >
                                <Plus className="w-4 h-4" />
                                Promote
                            </button>
                        )}
                    </NavLink>
                </div>
            </div>
        </div>

    );
}

export default Footer;