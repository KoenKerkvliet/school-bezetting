import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, Users, Calendar, GraduationCap,
  Settings, LogOut, User, Shield, ClipboardList, Mail,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const mainNavItems = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'absence',   label: 'Afwezigheid',  icon: Calendar },
  { id: 'staff',     label: "Collega's",    icon: Users },
  { id: 'logbook',   label: 'Logboek',      icon: ClipboardList },
];

const settingsItems = [
  { id: 'groups', label: 'Groepen', icon: BookOpen },
  { id: 'test-email', label: 'Test Email', icon: Mail },
];

export default function Navbar({ currentPage, setCurrentPage }) {
  const { user, role, logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsBtnRef = useRef(null);
  const flyoutRef = useRef(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0, left: 0 });

  const settingsPageIds = ['groups', 'admin', 'test-email'];
  const isSettingsActive = settingsPageIds.includes(currentPage);

  // Calculate flyout position when opening
  useEffect(() => {
    if (settingsOpen && settingsBtnRef.current) {
      const rect = settingsBtnRef.current.getBoundingClientRect();
      setFlyoutPos({
        top: rect.top,
        left: rect.right + 8,
      });
    }
  }, [settingsOpen]);

  // Close flyout on click outside
  useEffect(() => {
    if (!settingsOpen) return;

    const handleClickOutside = (e) => {
      if (
        flyoutRef.current && !flyoutRef.current.contains(e.target) &&
        settingsBtnRef.current && !settingsBtnRef.current.contains(e.target)
      ) {
        setSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleNavClick = (id) => {
    setCurrentPage(id);
    setSettingsOpen(false);
  };

  return (
    <aside className="w-56 bg-slate-800 text-white flex flex-col h-screen sticky top-0 flex-shrink-0">
      {/* Logo / App name */}
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="w-7 h-7 text-blue-400" />
          <div>
            <div className="font-bold text-sm leading-tight">School</div>
            <div className="font-bold text-sm leading-tight text-blue-400">Bezetting</div>
          </div>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {mainNavItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => handleNavClick(id)}
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
        {/* Settings toggle */}
        <button
          ref={settingsBtnRef}
          onClick={() => setSettingsOpen(!settingsOpen)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isSettingsActive || settingsOpen
              ? 'bg-slate-700 text-white'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          <span className="flex-1 text-left">Instellingen</span>
        </button>

        {/* Settings flyout (positioned to the right) */}
        {settingsOpen && (
          <div
            ref={flyoutRef}
            className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[180px]"
            style={{ top: flyoutPos.top, left: flyoutPos.left }}
          >
            {settingsItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  currentPage === id
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}

            {/* Admin — only for Admin role */}
            {role === 'Admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  currentPage === 'admin'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Shield className="w-4 h-4 flex-shrink-0" />
                Admin
              </button>
            )}
          </div>
        )}

        {/* Profile */}
        <button
          onClick={() => handleNavClick('profile')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            currentPage === 'profile'
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`}
        >
          <User className="w-5 h-5 flex-shrink-0" />
          Profiel
        </button>

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
          onClick={() => handleNavClick('changelog')}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          v1.0.0
        </button>
      </div>
    </aside>
  );
}
