import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import EmailVerification from './EmailVerification';
import PendingApproval from './PendingApproval';
import { Loader2 } from 'lucide-react';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, firebaseUser } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-ams-blue" />
      </div>
    );
  }

  // Safety Check: Authenticated technically but profile not loaded yet.
  // Prevents premature redirect to login page.
  if (firebaseUser && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-ams-blue" />
      </div>
    );
  }

  // 1. Check if logged in
  if (!user || !firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  // 2. Check Email Verification
  if (!firebaseUser.emailVerified) {
      return <EmailVerification />;
  }

  // 3. Check Account Status
  if (user.status === 'Pending') {
      return <PendingApproval />;
  }
  
  if (user.status === 'Suspended' || user.status === 'Rejected') {
      return <Navigate to="/login" replace />; // Login page handles error display
  }

  // 4. Check Role Permission (if specific roles required)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
      // Redirect to Dashboard if unauthorized for specific page
      return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;