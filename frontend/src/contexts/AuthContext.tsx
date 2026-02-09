import React, { createContext, useState, useContext, useEffect, useRef } from "react";
import axios from "../lib/axios";
import { getOrganizations } from "@/api/organizations/organizationsApi";
import { getCurrentUser } from "@/api/users/usersApi";
import { OrganizationContext } from "./OrganizationContext";

export interface UserData {
  username: string;
  apiKey: string;
  role: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  user: UserData;
  updateUser: (newUser: Partial<UserData>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const organizationContext = useContext(OrganizationContext);
  const organizationsLoadedRef = useRef(false);

  const isDevelopmentEnvironment: boolean = import.meta.env.VITE_ENVIRONMENT === "development"

  const [isAuthenticated, setIsAuthenticated] = useState(isDevelopmentEnvironment);
  const [user, setUser] = useState<UserData>({
    username: isDevelopmentEnvironment ? "devUser" : "",
    apiKey: isDevelopmentEnvironment ? import.meta.env.VITE_SPACE_ADMIN_API_KEY : "",
    role: "", // Will be loaded from API
  });

  // Load user role from API in development mode
  useEffect(() => {
    if (!isDevelopmentEnvironment || !user.apiKey || user.role) {
      return;
    }

    const loadUserRole = async () => {
      try {
        const currentUser = await getCurrentUser(user.apiKey);
        setUser(prev => ({
          ...prev,
          username: currentUser.username,
          role: currentUser.role
        }));
      } catch (error) {
        console.error('[AuthContext] Failed to load user role:', error);
      }
    };

    loadUserRole();
  }, [isDevelopmentEnvironment, user.apiKey, user.role]);

  // Load organizations when user is authenticated (for dev mode or after login)
  useEffect(() => {
    if (!isAuthenticated || !user.apiKey || !organizationContext) {
      return;
    }

    // Only load once per API key
    if (organizationsLoadedRef.current) {
      return;
    }

    let isMounted = true;

    const loadOrganizations = async () => {
      try {
        const organizations = await getOrganizations(user.apiKey);
        
        if (isMounted && organizations && organizations.length > 0) {
          // Mark as loaded ONLY after successful load
          organizationsLoadedRef.current = true;
          
          organizationContext.setOrganizations(organizations);
          
          // Set default organization
          const defaultOrg = organizations.find(org => org.default) || organizations[0];
          if (defaultOrg) {
            organizationContext.setCurrentOrganization(defaultOrg);
          } else {
            console.warn('[AuthContext] No default organization found, and organizations list is not empty');
          }
        } else if (isMounted) {
          console.warn('[AuthContext] No organizations returned from API');
        }
      } catch (error) {
        console.error('[AuthContext] Failed to load organizations:', error);
        // Don't mark as loaded on error so it can retry
      }
    };

    loadOrganizations();
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user.apiKey, organizationContext]);

  const login = async (username: string, password: string) => {
    try {
      const response = await axios.post(
        "/users/authenticate",
        { username, password },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const userData = response.data;
      if (!userData) {
        throw new Error("Authentication failed");
      }

      if (userData.role !== "ADMIN" && userData.role !== "USER") {
        throw new Error("Unauthorized user. You must be ADMIN or USER to access SPACE.");
      }

      // Reset organizations loaded flag for new user
      organizationsLoadedRef.current = false;

      const userInfo = {
        username: userData.username,
        apiKey: userData.apiKey,
        role: userData.role,
      };

      setUser(userInfo);
      setIsAuthenticated(true);
      // Organizations will be loaded by the useEffect above
    } catch (error: any) {
      throw new Error(error.response?.data?.error || error.message || "Authentication failed");
    }
  };

  const logout = () => {
    organizationsLoadedRef.current = false;
    
    setUser({
      username: "",
      apiKey: "",
      role: "",
    });
    setIsAuthenticated(false);
    
    // Clear organization context
    if (organizationContext) {
      organizationContext.setCurrentOrganization(null);
      organizationContext.setOrganizations([]);
    }
    
    // Clear localStorage
    localStorage.removeItem('currentOrganizationId');
    localStorage.removeItem('organizations');
  };

  // Allows updating the user from outside (e.g., after editing username or role)
  const updateUser = (newUser: Partial<UserData>) => {
    setUser((prev) => ({ ...prev, ...newUser }));
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, user, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
