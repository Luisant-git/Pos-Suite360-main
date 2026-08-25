import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  requiredPerms?: string | string[];
}

const ProtectedRoute = ({ requiredPerms }: ProtectedRouteProps) => {
  const storedUser = localStorage.getItem('user');
  let user = null;
  let permissions: string[] = [];

  if (storedUser) {
    try {
      user = JSON.parse(storedUser);
      permissions = user?.role?.permissions || [];
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
    }
  }

  const hasPerm = (perm: string) => {
    if (permissions.includes('ALL')) return true;
    if (permissions.length === 0 && !user?.roleId) return true; // demo fallback
    return permissions.includes(perm);
  };

  const hasAnyPerm = (perms: string[]) => {
    if (permissions.includes('ALL')) return true;
    if (permissions.length === 0 && !user?.roleId) return true; // demo fallback
    return perms.some(p => permissions.includes(p));
  };

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPerms) {
    let authorized = false;
    if (Array.isArray(requiredPerms)) {
      authorized = hasAnyPerm(requiredPerms);
    } else {
      authorized = hasPerm(requiredPerms);
    }

    if (!authorized) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
