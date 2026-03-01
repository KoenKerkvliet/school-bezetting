import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, BookOpen, Users, Calendar,
  Settings, LogOut, User, ClipboardList, Menu, X,
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

function NavItem({ id, label, icon: Icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      {label}
    </button>
  );
}

export default function Navbar({ currentPage, setCurrentPage }) {
  const { user, role, logout } = useAuth();
  const showSettings = isAdminOrAbove(role);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // Close drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setDrawerOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      setDrawerOpen(false);
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navigate = (page) => {
    setCurrentPage(page);
    setDrawerOpen(false);
  };

  const visibleNavItems = mainNavItems.filter(item => !item.adminOnly || isAdminOrAbove(role));

  // Shared navigation content (used by both sidebar and drawer)
  const renderNavContent = () => (
    <>
      {/* Main navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNavItems.map(({ id, label, icon }) => (
          <NavItem
            key={id}
            id={id}
            label={label}
            icon={icon}
            active={currentPage === id}
            onClick={() => navigate(id)}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-1 border-t border-slate-700 pt-3">
        <NavItem
          id="profile"
          label="Profiel"
          icon={User}
          active={currentPage === 'profile'}
          onClick={() => navigate('profile')}
        />

        {showSettings && (
          <NavItem
            id="settings"
            label="Instellingen"
            icon={Settings}
            active={currentPage === 'settings'}
            onClick={() => navigate('settings')}
          />
        )}

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
          onClick={() => navigate('changelog')}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          v{currentVersion}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 bg-slate-800 text-white flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <img src={logoImg} alt="School Bezetting" className="w-7 h-7 rounded-lg" />
          <div>
            <div className="font-bold text-sm leading-tight">School</div>
            <div className="font-bold text-sm leading-tight text-blue-400">Bezetting</div>
          </div>
        </div>
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          aria-label={drawerOpen ? 'Menu sluiten' : 'Menu openen'}
        >
          {drawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute top-0 left-0 w-64 h-full bg-slate-800 text-white flex flex-col pt-14 shadow-xl">
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-slate-800 text-white flex-col h-screen sticky top-0 flex-shrink-0">
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

        {renderNavContent()}
      </aside>
    </>
  );
}
