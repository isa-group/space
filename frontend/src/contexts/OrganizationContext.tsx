import React, { createContext, useState, useEffect } from 'react';
import type { Organization } from '@/types/Organization';

export interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  setCurrentOrganization: (organization: Organization | null) => void;
  setOrganizations: (organizations: Organization[]) => void;
  switchOrganization: (organizationId: string) => void;
  isLoading: boolean;
}

export const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load organization from localStorage on mount
  useEffect(() => {
    const savedOrgId = localStorage.getItem('currentOrganizationId');
    const savedOrgs = localStorage.getItem('organizations');
    
    if (savedOrgs) {
      try {
        const parsedOrgs = JSON.parse(savedOrgs) as Organization[];
        setOrganizations(parsedOrgs);
        
        if (savedOrgId) {
          const org = parsedOrgs.find(o => o.id === savedOrgId);
          if (org) {
            setCurrentOrganization(org);
          }
        } else {
          // Set default organization
          const defaultOrg = parsedOrgs.find(o => o.default) || parsedOrgs[0];
          if (defaultOrg) {
            setCurrentOrganization(defaultOrg);
            localStorage.setItem('currentOrganizationId', defaultOrg.id);
          }
        }
      } catch (error) {
        console.error('Failed to parse organizations from localStorage:', error);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Save current organization to localStorage when it changes
  useEffect(() => {
    if (currentOrganization) {
      localStorage.setItem('currentOrganizationId', currentOrganization.id);
    }
  }, [currentOrganization]);

  // Save organizations to localStorage when they change
  useEffect(() => {
    if (organizations.length > 0) {
      localStorage.setItem('organizations', JSON.stringify(organizations));
    }
  }, [organizations]);

  const switchOrganization = (organizationId: string) => {
    const org = organizations.find(o => o.id === organizationId);
    if (org) {
      setCurrentOrganization(org);
    } else {
      console.warn('[OrganizationContext] Organization not found:', organizationId);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        setCurrentOrganization,
        setOrganizations,
        switchOrganization,
        isLoading,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};
