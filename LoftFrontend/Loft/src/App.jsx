import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, AdminRoute,LoggedIn } from './components/auth/ProtectedRoute';
import AppLayout   from './components/layout/AppLayout';
import AdminLayout from './components/layout/AdminLayout';

/* Public pages */
import LandingPage    from './pages/LandingPage';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import PricingPage    from './pages/PricingPage';
import CharitiesPage  from './pages/CharitiesPage';

/* User (authenticated) pages */
import DashboardPage from './pages/dashboard/DashboardPage';
import ScoresPage    from './pages/dashboard/ScoresPage';
import DrawsPage     from './pages/dashboard/DrawsPage';
import WinningsPage  from './pages/dashboard/WinningsPage';

/* Admin pages */
import AdminOverviewPage   from './pages/admin/AdminOverviewPage';
import AdminUsersPage      from './pages/admin/AdminUsersPage';
import AdminDrawsPage      from './pages/admin/AdminDrawsPage';
//import AdminCharitiesPage  from './pages/admin/AdminCharitiesPage';
//import AdminWinnersPage    from './pages/admin/AdminWinnersPage';

/* Wrap pages that need the sidebar shell */
const App_ = ({ children }) => <AppLayout>{children}</AppLayout>;
const Adm_ = ({ children }) => <AdminLayout>{children}</AdminLayout>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ───────────────────────────────────────────────── */}
          <Route path="/"  element={<LandingPage />} />
          
            <Route path="/login"     element={<LoggedIn><LoginPage /> </LoggedIn>} />
            <Route path="/register"  element={<RegisterPage />} />
       
          <Route path="/pricing"   element={<PricingPage />} />
          <Route path="/charities" element={<CharitiesPage />} />

          {/* ── Authenticated user pages ─────────────────────────────── */}
          <Route path="/dashboard" element={<ProtectedRoute><App_><DashboardPage /></App_></ProtectedRoute>} />
          <Route path="/scores"    element={<ProtectedRoute><App_><ScoresPage    /></App_></ProtectedRoute>} />
          <Route path="/draws"     element={<ProtectedRoute><App_><DrawsPage     /></App_></ProtectedRoute>} />
          <Route path="/winnings"  element={<ProtectedRoute><App_><WinningsPage  /></App_></ProtectedRoute>} />

          {/* ── Admin pages ──────────────────────────────────────────── */}
          <Route path="/admin"            element={<AdminRoute><Adm_><AdminOverviewPage  /></Adm_></AdminRoute>} />
          <Route path="/admin/users"      element={<AdminRoute><Adm_><AdminUsersPage     /></Adm_></AdminRoute>} />
          <Route path="/admin/draws"      element={<AdminRoute><Adm_><AdminDrawsPage     /></Adm_></AdminRoute>} />
         {/*<Route path="/admin/charities"  element={<AdminRoute><Adm_><AdminCharitiesPage /></Adm_></AdminRoute>} />
          <Route path="/admin/winners"    element={<AdminRoute><Adm_><AdminWinnersPage   /></Adm_></AdminRoute>} />*/}  

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}