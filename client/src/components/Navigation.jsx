import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Home, Settings, Zap } from 'lucide-react';

export default function Navigation() {
  const location = useLocation();
  const menu = [
    { name: 'Leads', path: '/', icon: Users },
    { name: 'Board', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Homes', path: '/listings', icon: Home },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* DESKTOP */}
      <nav className="hidden md:flex w-20 bg-[#0f172a] flex-col items-center py-8 gap-10 shadow-2xl z-50">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-500/40"><Zap size={24} color="white" /></div>
        <div className="flex flex-col gap-8">
          {menu.map(item => (
            <Link key={item.name} to={item.path} className={`transition-all ${location.pathname === item.path ? 'text-blue-500 scale-110' : 'text-slate-500 hover:text-white'}`}>
              <item.icon size={26} />
            </Link>
          ))}
        </div>
      </nav>

      {/* MOBILE (X-Style) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-2 z-50 shadow-lg">
        {menu.map(item => (
          <Link key={item.name} to={item.path} className={`flex flex-col items-center justify-center w-full h-full ${location.pathname === item.path ? 'text-blue-600' : 'text-slate-400'}`}>
            <item.icon size={24} />
          </Link>
        ))}
      </nav>
    </>
  );
}