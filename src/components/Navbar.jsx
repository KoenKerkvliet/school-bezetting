import React from 'react';
import { LayoutDashboard, BookOpen, Users, GraduationCap } from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'staff',     label: "Collega's",  icon: Users },
  { id: 'groups',    label: 'Groepen',    icon: BookOpen },
];

export default function Navbar({ currentPage, setCurrentPage }) {
  return (
    <nav className="bg-blue-700 text-white shadow-lg">
      <div className="container mx-auto px-4" style={{ maxWidth: '1600px' }}>
        <div className="flex items-center h-14 gap-6">
          <div className="flex items-center gap-2 font-bold text-lg">
            <GraduationCap className="w-6 h-6" />
            <span>School Planning</span>
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
      </div>
    </nav>
  );
}
