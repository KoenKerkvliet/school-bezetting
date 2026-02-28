import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider, useApp } from './context/AppContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import AbsencePage from './components/AbsencePage.jsx';
import GroupsPage from './components/GroupsPage.jsx';
import StaffPage from './components/StaffPage.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import SyncStatusBar from './components/SyncStatusBar.jsx';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [navigateDate, setNavigateDate] = useState(null);
  const { loading: appLoading, error: appError } = useApp();
  const { role } = useAuth();

  const handleNavigateToDay = (date) => {
    setNavigateDate(date);
    setCurrentPage('dashboard');
  };

  if (appLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Data laden...</p>
        </div>
      </div>
    );
  }

  if (appError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-2">⚠️ Fout bij laden data</p>
          <p className="text-sm text-gray-600">{appError}</p>
          <p className="text-sm text-gray-500 mt-2">Lokale backup wordt gebruikt</p>
        </div>
      </div>
    );
  }

  // Admin panel for admins
  if (currentPage === 'admin') {
    return <AdminDashboard onBack={() => setCurrentPage('dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 container mx-auto px-4 py-6" style={{ maxWidth: '1600px' }}>
        {currentPage === 'dashboard' && <Dashboard initialDate={navigateDate} onInitialDateUsed={() => setNavigateDate(null)} />}
        {currentPage === 'absence' && <AbsencePage onBack={() => setCurrentPage('dashboard')} onNavigateToDay={handleNavigateToDay} />}
        {currentPage === 'groups' && <GroupsPage />}
        {currentPage === 'staff' && <StaffPage />}
      </main>
    </div>
  );
}

function MainApp() {
  return (
    <AppProvider>
      <AppContent />
      <SyncStatusBar />
    </AppProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <MainApp />
      </ProtectedRoute>
    </AuthProvider>
  );
}
