import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import PublicProducts from './pages/PublicProducts';
import PublicServices from './pages/PublicServices';
import SalesDashboard from './pages/SalesDashboard';
import ProductsPage from './pages/ProductsPage';
import ServicesPage from './pages/ServicesPage';
import SurveyForm from './pages/SurveyForm';
import PartiesPage from './pages/PartiesPage';
import EnquiryPage from './pages/EnquiryPage';
import POSPage from './pages/POSPage';
import QuotationPage from './pages/QuotationPage';
import OrdersPage from './pages/OrdersPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import PurchasesPage from './pages/PurchasesPage';
import ChallansPage from './pages/ChallansPage';
import CustomerDashboard from './pages/CustomerDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AuditorDashboard from './pages/AuditorDashboard';
import AuditLogPage from './pages/AuditLogPage';
import ExpensesPage from './pages/ExpensesPage';
import RecurringServicesPage from './pages/RecurringServicesPage';
import ProtectedRoute from './components/ProtectedRoute';
import api from './utils/api';
import { useAuthStore } from './store/authStore';
import { Loader2 } from 'lucide-react';

function App() {
  const setUser = useAuthStore(state => state.setUser);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get('/me');
        setUser(res.data.user);
      } catch (err) {
        setUser(null);
      } finally {
        setInitializing(false);
      }
    };
    checkSession();
  }, [setUser]);

  if (initializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft text-navy text-center p-6">
        <Loader2 className="h-10 w-10 animate-spin mb-4 text-blue" />
        <p className="font-bold uppercase tracking-widest text-[10px] opacity-50">Secure Session Link Initializing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-soft">
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/products" element={<PublicProducts />} />
        <Route path="/services" element={<PublicServices />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes (Staff & Customer Dashboards) */}
        <Route element={<ProtectedRoute />}>
          {/* Dashboards */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/auditor/dashboard" element={<AuditorDashboard />} />
          <Route path="/sales/dashboard" element={<SalesDashboard />} />
          <Route path="/employee/dashboard" element={<SalesDashboard />} />
          <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />

          {/* Management Modules */}
          <Route path="/inventory" element={<ProductsPage />} />
          <Route path="/tickets" element={<ServicesPage />} />
          <Route path="/tickets/:id/survey" element={<SurveyForm />} />
          <Route path="/enquiry" element={<EnquiryPage />} />
          <Route path="/parties" element={<PartiesPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/quotations" element={<QuotationPage />} />
          <Route path="/quotations/:id" element={<QuotationPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/challans" element={<ChallansPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/recurring-services" element={<RecurringServicesPage />} />
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/audit-log" element={<AuditLogPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
