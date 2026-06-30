import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { subscribeToPushNotifications } from '../push';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRole: string | string[];
}

export default function RoleRoute({ children, allowedRole }: RoleRouteProps) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    // We can no longer auto-subscribe here because mobile browsers block Notification.requestPermission()
    // if it isn't tied to a direct user gesture (like a button click).
  }, []);

  const userStr = localStorage.getItem('currentUser') || localStorage.getItem('user');
  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    const userRole = user.role || '';
    
    const allowedRoles = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
    const isAllowed = allowedRoles.some(role => {
      return userRole === role || userRole === `ROLE_${role.toUpperCase()}`;
    });

    if (!isAllowed) {
      // Redirect to the user's own dashboard instead of /unauthorized
      if (userRole === 'ROLE_DOCTOR' || userRole === 'DOCTOR') {
        return <Navigate to="/doctor" replace />;
      } else if (userRole === 'ROLE_MEDIATOR' || userRole === 'MEDIATOR') {
        return <Navigate to="/mediator" replace />;
      } else if (userRole === 'ROLE_PATIENT' || userRole === 'PATIENT') {
        return <Navigate to="/patient-portal" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  } catch (e) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
