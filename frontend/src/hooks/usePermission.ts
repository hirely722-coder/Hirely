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

    // 1. Check member-level restrictions (Owner bypasses)
    if (roleLower !== 'owner') {
      const userRestricted = currentUserRestrictedFeatures || [];
      if (userRestricted.map(f => f.toLowerCase()).includes(feature.toLowerCase())) {
        return true;
      }
    }

    // 2. Check global workspace locks (Applies to all users)
    if (lockedFeatures) {
      if (lockedFeatures.map(f => f.toLowerCase()).includes(feature.toLowerCase())) {
        return true;
      }
    }

    return false;
  };

  return {
    can,
    isLocked,
    userRole: currentUserRole,
    permissions: currentUserPermissions || [],
    lockedFeatures: lockedFeatures || []
  };
}
