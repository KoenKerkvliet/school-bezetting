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
import ProfilePage from './components/ProfilePage.jsx';
import LogbookPage from './components/LogbookPage.jsx';
import TestEmailPage from './components/TestEmailPage.jsx';
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
    setCurrentPage('admin');
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
      <main className="flex-1 min-w-0 overflow-auto">
        <div className="px-6 py-6">
          {currentPage === 'dashboard' && <Dashboard initialDate={navigateDate} onInitialDateUsed={() => setNavigateDate(null)} />}
          {currentPage === 'absence' && <AbsencePage onBack={() => setCurrentPage('dashboard')} onNavigateToDay={handleNavigateToDay} />}
          {currentPage === 'groups' && <GroupsPage />}
          {currentPage === 'staff' && <StaffPage />}
          {currentPage === 'logbook' && <LogbookPage />}
          {currentPage === 'test-email' && <TestEmailPage />}
          {currentPage === 'admin' && <AdminDashboard onBack={() => setCurrentPage('dashboard')} onNavigateToUserDetail={handleNavigateToUserDetail} />}
          {currentPage === 'user-detail' && selectedUserId && <UserDetailPage userId={selectedUserId} onBack={handleBackFromUserDetail} />}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'changelog' && <ChangelogPage />}
        </div>
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
