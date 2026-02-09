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
    console.log('[OrganizationContext] Initial mount - loading from localStorage');
    const savedOrgId = localStorage.getItem('currentOrganizationId');
    const savedOrgs = localStorage.getItem('organizations');
    
    console.log('[OrganizationContext] savedOrgId:', savedOrgId);
    console.log('[OrganizationContext] savedOrgs:', savedOrgs);
    
    if (savedOrgs) {
      try {
        const parsedOrgs = JSON.parse(savedOrgs) as Organization[];
        console.log('[OrganizationContext] Parsed organizations:', parsedOrgs.length);
        setOrganizations(parsedOrgs);
        
        if (savedOrgId) {
          const org = parsedOrgs.find(o => o.id === savedOrgId);
          if (org) {
            console.log('[OrganizationContext] Setting current org from localStorage:', org.name);
            setCurrentOrganization(org);
          } else {
            console.log('[OrganizationContext] Saved org ID not found in organizations');
          }
        } else {
          // Set default organization
          const defaultOrg = parsedOrgs.find(o => o.default) || parsedOrgs[0];
          if (defaultOrg) {
            console.log('[OrganizationContext] Setting default organization:', defaultOrg.name);
            setCurrentOrganization(defaultOrg);
            localStorage.setItem('currentOrganizationId', defaultOrg.id);
          }
        }
      } catch (error) {
        console.error('[OrganizationContext] Failed to parse organizations from localStorage:', error);
      }
    } else {
      console.log('[OrganizationContext] No saved organizations in localStorage');
    }
    
    setIsLoading(false);
  }, []);

  // Save current organization to localStorage when it changes
  useEffect(() => {
    if (currentOrganization) {
      console.log('[OrganizationContext] Saving current org to localStorage:', currentOrganization.id, currentOrganization.name);
      localStorage.setItem('currentOrganizationId', currentOrganization.id);
    }
  }, [currentOrganization]);

  // Save organizations to localStorage when they change
  useEffect(() => {
    if (organizations.length > 0) {
      console.log('[OrganizationContext] Saving organizations to localStorage:', organizations.length);
      localStorage.setItem('organizations', JSON.stringify(organizations));
    }
  }, [organizations]);

  const switchOrganization = (organizationId: string) => {
    console.log('[OrganizationContext] Switching to organization:', organizationId);
    console.log('[OrganizationContext] Available organizations:', organizations.map(o => ({ id: o.id, name: o.name })));
    const org = organizations.find(o => o.id === organizationId);
    if (org) {
      console.log('[OrganizationContext] Organization found, switching to:', org.name);
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
