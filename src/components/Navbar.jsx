import React from 'react';
import { LayoutDashboard, BookOpen, Users, GraduationCap, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'staff',     label: "Collega's",  icon: Users },
  { id: 'groups',    label: 'Groepen',    icon: BookOpen },
];

export default function Navbar({ currentPage, setCurrentPage }) {
  const { user, role, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <nav className="bg-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4" style={{ maxWidth: '1600px' }}>
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 font-bold text-lg">
              <GraduationCap className="w-6 h-6" />
              <span>School Bezetting</span>
            </div>
            <div className="flex gap-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentPage(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === id
                      ? 'bg-white/20 text-white'
                      : 'text-blue-100 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Right side: Admin link + User menu */}
          <div className="flex items-center gap-4">
            {role === 'Admin' && (
              <button
                onClick={() => setCurrentPage('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 'admin'
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10'
                }`}
              >
                <Settings className="w-4 h-4" />
                Admin
              </button>
            )}

            {/* User info + Logout */}
            <div className="flex items-center gap-3 pl-4 border-l border-blue-600">
              <div className="text-right text-sm">
                <div className="font-medium">{user?.email}</div>
                <div className="text-blue-100 text-xs">{role}</div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-blue-100 hover:bg-red-600 transition-colors"
                title="Uitloggen"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
