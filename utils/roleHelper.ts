
import { Role } from '../types';

export const ROLE_HIERARCHY: Record<Role, number> = {
  [Role.Pending]: 0,
  [Role.Welfare]: 1,
  [Role.FirstAider]: 1,
  [Role.FREC3]: 2,
  [Role.FREC4]: 3,
  [Role.EMT]: 4,
  [Role.Paramedic]: 5,
  [Role.Nurse]: 6,
  [Role.Doctor]: 7,
  [Role.Manager]: 10,
  [Role.Admin]: 10
};

export const canPerformRole = (userRole: Role, requiredRole: Role): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export const getRoleColor = (role: Role): string => {
  switch (role) {
    case Role.Admin:
    case Role.Manager:
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case Role.Doctor:
    case Role.Nurse:
    case Role.Paramedic:
      return 'text-green-600 bg-green-50 border-green-200';
    case Role.EMT:
    case Role.FREC4:
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case Role.FirstAider:
    case Role.Welfare:
      return 'text-teal-600 bg-teal-50 border-teal-200';
    case Role.Pending:
      return 'text-amber-600 bg-amber-50 border-amber-200';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200';
  }
};
