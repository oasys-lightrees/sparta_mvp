import type { Role } from '@/types';

// Home route for each role after authentication.
export const roleHome = (role: Role): string => {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'MENTOR':
      return '/mentor';
    default:
      return '/dashboard';
  }
};
