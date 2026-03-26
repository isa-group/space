import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router";
import MainPage from "../pages/main";
import LoggedLayout from "@/layouts/logged-view";
import MembersPage from "@/pages/members";
import ApiKeysPage from "@/pages/api-keys";
import ServicesPage from "@/pages/services";
import ServiceDetailPage from "@/pages/services/ServiceDetailPage";
import SettingsPage from "@/pages/settings";
import ContractsDashboard from "@/pages/contracts/ContractsDashboard";
import ContractDetailPage from "@/pages/contracts/ContractDetailPage";
import InstanceMonitoringPage from "@/pages/instance-monitoring";
import OrganizationSettingsPage from "@/pages/organization-settings";
import RegisterPage from "@/pages/register";
import NotFoundPage from "@/pages/not-found";
import UsersPage from "@/pages/users";
import OrganizationsPage from "@/pages/organizations";
import useAuth from "@/hooks/useAuth";
import type { ReactNode } from "react";

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to={`${import.meta.env.BASE_URL}`} state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function RequireRole({ children, allowedRoles }: { children: ReactNode; allowedRoles: string[] }) {
  const { user } = useAuth();
  const userRole = user?.role?.trim().toUpperCase();
  
  if (!allowedRoles.map(r => r.toUpperCase()).includes(userRole)) {
    return <NotFoundPage />;
  }
  
  return <>{children}</>;
}

export function SpaceRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path={import.meta.env.BASE_URL} element={<MainPage/>}/>
        <Route path={import.meta.env.BASE_URL + "register"} element={<RegisterPage/>}/>
        <Route path={import.meta.env.BASE_URL + "contracts/dashboard"} element={<RequireAuth><LoggedLayout><ContractsDashboard/></LoggedLayout></RequireAuth>} />
        <Route path={import.meta.env.BASE_URL + "contracts/:userId"} element={<RequireAuth><LoggedLayout><ContractDetailPage/></LoggedLayout></RequireAuth>} />
        <Route path={import.meta.env.BASE_URL + "instance-monitoring"} element={<RequireAuth><RequireRole allowedRoles={['ADMIN']}><LoggedLayout><InstanceMonitoringPage/></LoggedLayout></RequireRole></RequireAuth>} />
        <Route path={import.meta.env.BASE_URL + "users"} element={<RequireAuth><RequireRole allowedRoles={['ADMIN']}><LoggedLayout><UsersPage/></LoggedLayout></RequireRole></RequireAuth>} />
        <Route path={import.meta.env.BASE_URL + "organizations"} element={<RequireAuth><RequireRole allowedRoles={['ADMIN']}><LoggedLayout><OrganizationsPage/></LoggedLayout></RequireRole></RequireAuth>} />
        <Route path={import.meta.env.BASE_URL + "members"} element={<RequireAuth><LoggedLayout><MembersPage/></LoggedLayout></RequireAuth>}/>
        <Route path={import.meta.env.BASE_URL + "api-keys"} element={<RequireAuth><LoggedLayout><ApiKeysPage/></LoggedLayout></RequireAuth>}/>
        <Route path={import.meta.env.BASE_URL + "services"} element={<RequireAuth><LoggedLayout><ServicesPage/></LoggedLayout></RequireAuth>}/>
        <Route path={import.meta.env.BASE_URL + "services/:name"} element={<RequireAuth><LoggedLayout><ServiceDetailPage/></LoggedLayout></RequireAuth>}/>
        <Route path={import.meta.env.BASE_URL + "settings"} element={<RequireAuth><LoggedLayout><SettingsPage/></LoggedLayout></RequireAuth>}/>
        <Route path={import.meta.env.BASE_URL + "organization-settings"} element={<RequireAuth><LoggedLayout><OrganizationSettingsPage/></LoggedLayout></RequireAuth>}/>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}