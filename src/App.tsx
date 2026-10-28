import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { Appointments } from './pages/Appointments';
import { SmartCalendar } from './pages/SmartCalendar';
import { Clients } from './pages/Clients';
import { Services } from './pages/Services';
import { Finance } from './pages/Finance';

const ProtectedRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="agendamentos" element={<Appointments />} />
        <Route path="calendario" element={<SmartCalendar />} />
        <Route path="clientes" element={<Clients />} />
        <Route path="servicos" element={<Services />} />
        <Route path="financeiro" element={<Finance />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
};

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ProtectedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;