
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import EmailVerification from './EmailVerification';
import PendingApproval from './PendingApproval';
import PinSetup from './PinSetup';
import { Loader2 } from 'lucide-react';
import { Role } from '../types';

interface ProtectedRouteProps {
  children?: React.ReactNode;
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

  // Safety Check
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
      return <Navigate to="/login" replace />; 
  }

  // 4. Check PIN Setup (New Requirement)
  // If user is Active but has no PIN, force setup
  if (user.status === 'Active' && !user.pin) {
      return <PinSetup />;
  }

  // 5. Check Role Permission
  if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
