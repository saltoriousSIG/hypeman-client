import React from "react";
import { NavLink } from "react-router-dom";
import { Volume2, Plus, Settings } from "lucide-react";

const navItems = [
  { to: "/", label: "Hype", icon: Volume2 },
  { to: "/creators", label: "Promote", icon: Plus },
  { to: "/manage", label: "Manage", icon: Settings },
];

const Footer: React.FC = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-black/80 to-transparent backdrop-blur-xl pt-3 pb-6 px-4 border-t border-white/5">
      <div className="max-w-md mx-auto grid grid-cols-3 gap-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className="block">
            {({ isActive }) => (
              <button
                className={`w-full flex flex-col items-center gap-1.5 rounded-2xl border transition-all duration-300 cursor-pointer px-4 py-3 ${
                  isActive
                    ? "border-transparent bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25"
                    : "border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-semibold tracking-wide uppercase">
                  {label}
                </span>
                <span
                  className={`h-1 w-8 rounded-full ${
                    isActive ? "bg-white/90" : "bg-white/10"
                  }`}
                />
              </button>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default Footer;
