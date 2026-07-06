import { useApp } from '../context/AppContext';

export function usePermission() {
  const { currentUserRole, currentUserPermissions, lockedFeatures, currentUserRestrictedFeatures } = useApp();

  const can = (permission: string): boolean => {
    if (!currentUserRole) return false;
    const roleLower = currentUserRole.toLowerCase();

    // Owner has unrestricted access
    if (roleLower === 'owner') {
      return true;
    }

    if (!currentUserPermissions) return false;
    
    // Check exact permission, wildcard, or module wildcard (e.g. 'candidates.*')
    return (
      currentUserPermissions.includes(permission) ||
      currentUserPermissions.includes('*') ||
      currentUserPermissions.includes(permission.split('.')[0] + '.*')
    );
  };

  const isLocked = (feature: string): boolean => {
    if (!currentUserRole) return false;
    const roleLower = currentUserRole.toLowerCase();

    // Owner bypasses all locks
    if (roleLower === 'owner') return false;

    // Check individual member restrictions
    const userRestricted = currentUserRestrictedFeatures || [];
    if (userRestricted.map(f => f.toLowerCase()).includes(feature.toLowerCase())) {
      return true;
    }

    // Admin bypasses global workspace locks, other roles blocked
    if (roleLower === 'admin') return false;

    if (!lockedFeatures) return false;
    return lockedFeatures.map(f => f.toLowerCase()).includes(feature.toLowerCase());
  };

  return {
    can,
    isLocked,
    userRole: currentUserRole,
    permissions: currentUserPermissions || [],
    lockedFeatures: lockedFeatures || []
  };
}
