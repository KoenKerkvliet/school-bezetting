import React from 'react';
import {
  LayoutDashboard, BookOpen, Users, Calendar,
  Settings, LogOut, User, ClipboardList,
} from 'lucide-react';
import logoImg from '/favicon.svg';
import { useAuth } from '../context/AuthContext';
import { isAdminOrAbove } from '../utils/roles';
import changelog from '../changelog.json';

const currentVersion = changelog[0]?.version || '1.0.0';

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'absence',   label: 'Afwezigheid',  icon: Calendar },
  { id: 'staff',     label: "Collega's",    icon: Users },
  { id: 'groups',    label: 'Groepen',      icon: BookOpen, adminOnly: true },
  { id: 'logbook',   label: 'Logboek',      icon: ClipboardList },
];

export default function Navbar({ currentPage, setCurrentPage }) {
  const { user, role, logout } = useAuth();
  const showSettings = isAdminOrAbove(role);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <aside className="w-56 bg-slate-800 text-white flex flex-col h-screen sticky top-0 flex-shrink-0">
      {/* Logo / App name */}
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="School Bezetting" className="w-8 h-8 rounded-lg" />
          <div>
            <div className="font-bold text-sm leading-tight">School</div>
            <div className="font-bold text-sm leading-tight text-blue-400">Bezetting</div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {mainNavItems
          .filter(item => !item.adminOnly || isAdminOrAbove(role))
          .map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentPage(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === id
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t border-slate-700 pt-3">
        {/* Profile */}
        <button
          onClick={() => setCurrentPage('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 'profile'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <User className="w-5 h-5 flex-shrink-0" />
          Profiel
        </button>

        {/* Settings — only Admin and above */}
        {showSettings && (
          <button
            onClick={() => setCurrentPage('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentPage === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            Instellingen
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-600/20 hover:text-red-300 transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          Uitloggen
        </button>
      </div>

      {/* Version footer */}
      <div className="px-3 pb-3 pt-1 border-t border-slate-700">
        <button
          onClick={() => setCurrentPage('changelog')}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          v{currentVersion}
        </button>
      </div>
    </aside>
  );
}
