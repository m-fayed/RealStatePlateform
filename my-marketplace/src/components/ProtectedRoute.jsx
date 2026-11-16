import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, user, loading, authError, refreshUser } = useAuth();
  if (loading) return <p className="page-container py-8">جاري التحقق من الحساب...</p>;
  if (isAuthenticated && authError) return <div className="page-container py-8"><p role="alert">{authError}</p><button onClick={refreshUser} className="btn-secondary">إعادة المحاولة</button></div>;

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
