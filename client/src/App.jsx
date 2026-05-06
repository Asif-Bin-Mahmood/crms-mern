import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import DevicesPage from './pages/DevicesPage.jsx';
import RepairsPage from './pages/RepairsPage.jsx';
import RepairDetailPage from './pages/RepairDetailPage.jsx';
import BillsPage from './pages/BillsPage.jsx';
import BillDetailPage from './pages/BillDetailPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import SparePartsPage from './pages/SparePartsPage.jsx';
import AdminUsersPage from './pages/AdminUsersPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import AssignmentsPage from './pages/AssignmentsPage.jsx';
import DeliveryManPage from './pages/DeliveryManPage.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import PaymentSuccess from './pages/PaymentSuccess.jsx';
import PaymentFail from './pages/PaymentFail.jsx';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'DELIVERY_MAN' && location.pathname !== '/delivery') {
    return <Navigate to="/delivery" replace />;
  }
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/" replace />;
  return children;
}
function DeliveryRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <p>Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'DELIVERY_MAN') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
        <Route
          path="/delivery"
          element={
            <DeliveryRoute>
              <DeliveryManPage/>
            </DeliveryRoute>
          }
        />      
      
      
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Home />} />
        <Route path="dashboard" element={<CustomerDashboard />} />
        <Route path="payment/success" element={<PaymentSuccess />} />
        <Route path="payment/fail" element={<PaymentFail />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="repairs" element={<RepairsPage />} />
        <Route path="repairs/:id" element={<RepairDetailPage />} />
        <Route path="bills" element={<BillsPage />} />
        <Route path="bills/:id" element={<BillDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="spare-parts" element={<SparePartsPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route
          path="admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
        <Route
          path="admin/analytics"
          element={
            <AdminRoute>
              <AnalyticsPage />
            </AdminRoute>
          }
        />

      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
