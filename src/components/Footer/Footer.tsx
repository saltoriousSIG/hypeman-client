import React from "react";
import { NavLink } from "react-router-dom";
import { Zap, Plus } from "lucide-react";

interface FooterProps { }

const Footer: React.FC<FooterProps> = ({ }) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/20 z-50">
            <div className="px-6 py-4">
                <div className="flex items-center justify-center gap-3">
                    <NavLink to="/">
                        <button className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-semibold transition-all duration-300 border border-white/10">
                            <Zap className="w-4 h-4" />
                            Browse
                        </button>
                    </NavLink>
                    <NavLink to="/creators">
                        <button className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full text-white text-sm font-bold transition-all duration-300 shadow-lg shadow-purple-500/25">
                            <Plus className="w-4 h-4" />
                            Create
                        </button>
                    </NavLink>
                </div>
            </div>
        </div>

    );
}

export default Footer;