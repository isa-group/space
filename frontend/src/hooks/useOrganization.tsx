import { useContext } from 'react';
import type { OrganizationContextType } from '@/contexts/OrganizationContext';
import { OrganizationContext } from '@/contexts/OrganizationContext';

export function useOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
