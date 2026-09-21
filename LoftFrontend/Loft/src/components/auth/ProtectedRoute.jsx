import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';

/* Redirect unauthenticated users to /login, preserving intended destination */
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner full />;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

/* Admin-only gate — redirects non-admins to dashboard */
export function AdminRoute({ children }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  if (loading)  return <Spinner full />;
  if (!user)    return <Navigate to="/login"     state={{ from: location }} replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export function LoggedIn({children}){
  const {user}= useAuth();
  const location = useLocation();
  if(user) return <Navigate to="/dashboard" state={{ from: location }} replace />
  return children;
}