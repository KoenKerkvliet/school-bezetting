import React, { useState } from 'react';
import { AppProvider } from './context/AppContext.jsx';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import GroupsPage from './components/GroupsPage.jsx';
import StaffPage from './components/StaffPage.jsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main className="flex-1 container mx-auto px-4 py-6" style={{ maxWidth: '1600px' }}>
          {currentPage === 'dashboard' && <Dashboard />}
          {currentPage === 'groups' && <GroupsPage />}
          {currentPage === 'staff' && <StaffPage />}
        </main>
      </div>
    </AppProvider>
  );
}
