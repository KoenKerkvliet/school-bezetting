import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import GroupsPage from './components/GroupsPage.jsx';
import StaffPage from './components/StaffPage.jsx';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { loading, error } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Data laden...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">⚠️ Fout bij laden data</p>
          <p className="text-sm text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Lokale backup wordt gebruikt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 container mx-auto px-4 py-6" style={{ maxWidth: '1600px' }}>
        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'groups' && <GroupsPage />}
        {currentPage === 'staff' && <StaffPage />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
