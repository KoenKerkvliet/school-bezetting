import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { isAdminOrAbove } from './utils/roles';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import AbsencePage from './components/AbsencePage.jsx';
import GroupsPage from './components/GroupsPage.jsx';
import StaffPage from './components/StaffPage.jsx';
import ProfilePage from './components/ProfilePage.jsx';
import LogbookPage from './components/LogbookPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import UserDetailPage from './components/UserDetailPage.jsx';
import ChangelogPage from './components/ChangelogPage.jsx';
import SyncStatusBar from './components/SyncStatusBar.jsx';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [navigateDate, setNavigateDate] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const { loading: appLoading, error: appError } = useApp();
  const { role } = useAuth();

  const handleNavigateToDay = (date) => {
    setNavigateDate(date);
    setCurrentPage('dashboard');
  };

  const handleNavigateToUserDetail = (userId) => {
    setSelectedUserId(userId);
    setCurrentPage('user-detail');
  };

  const handleBackFromUserDetail = () => {
    setSelectedUserId(null);
    setCurrentPage('settings');
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
          <p className="text-red-600 mb-2">Fout bij laden data</p>
          <p className="text-sm text-gray-600">{appError}</p>
          <p className="text-sm text-gray-500 mt-2">Lokale backup wordt gebruikt</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 min-w-0 overflow-auto flex flex-col pt-14 md:pt-0">
        <div className="px-3 py-3 md:px-6 md:py-6 flex-1">
          {currentPage === 'dashboard' && <Dashboard initialDate={navigateDate} onInitialDateUsed={() => setNavigateDate(null)} />}
          {currentPage === 'absence' && <AbsencePage onBack={() => setCurrentPage('dashboard')} onNavigateToDay={handleNavigateToDay} />}
          {currentPage === 'groups' && (isAdminOrAbove(role) ? <GroupsPage /> : <Dashboard initialDate={navigateDate} onInitialDateUsed={() => setNavigateDate(null)} />)}
          {currentPage === 'staff' && <StaffPage />}
          {currentPage === 'logbook' && <LogbookPage />}
          {currentPage === 'settings' && (isAdminOrAbove(role) ? <SettingsPage onNavigateToUserDetail={handleNavigateToUserDetail} /> : <Dashboard initialDate={navigateDate} onInitialDateUsed={() => setNavigateDate(null)} />)}
          {currentPage === 'user-detail' && selectedUserId && (isAdminOrAbove(role) ? <UserDetailPage userId={selectedUserId} onBack={handleBackFromUserDetail} /> : <Dashboard initialDate={navigateDate} onInitialDateUsed={() => setNavigateDate(null)} />)}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'changelog' && <ChangelogPage />}
        </div>
        <footer className="px-3 md:px-6 py-3 text-xs text-gray-400 border-t border-gray-200">
          &copy; {new Date().getFullYear()} <a href="https://designpixels.nl" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-600 transition-colors">Design Pixels</a>
        </footer>
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
