import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import { Purchases, Customers, Suppliers } from './pages/PurchasesCustomersSuppliers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { Spinner } from './components/ui';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Spinner className="w-8 h-8" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Spinner className="w-8 h-8" />
    </div>
  );
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="inventory"  element={<Inventory />} />
        <Route path="sales"      element={<Sales />} />
        <Route path="purchases"  element={<ProtectedRoute adminOnly><Purchases /></ProtectedRoute>} />
        <Route path="customers"  element={<Customers />} />
        <Route path="suppliers"  element={<ProtectedRoute adminOnly><Suppliers /></ProtectedRoute>} />
        <Route path="reports"    element={<Reports />} />
        <Route path="settings"   element={<Settings />} />
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
