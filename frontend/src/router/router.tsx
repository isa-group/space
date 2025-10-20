import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router";
import MainPage from "../pages/main";
import LoggedLayout from "@/layouts/logged-view";
import UsersPage from "@/pages/users";
import ServicesPage from "@/pages/services";
import ServiceDetailPage from "@/pages/services/ServiceDetailPage";
import SettingsPage from "@/pages/settings";
import ContractsDashboard from "@/pages/contracts/ContractsDashboard";
import useAuth from "@/hooks/useAuth";
import type { ReactNode } from "react";

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

export function SpaceRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPage/>}/>
  <Route path="/contracts/dashboard" element={<RequireAuth><LoggedLayout><ContractsDashboard/></LoggedLayout></RequireAuth>} />
        <Route path="/users" element={<RequireAuth><LoggedLayout><UsersPage/></LoggedLayout></RequireAuth>}/>
        <Route path="/services" element={<RequireAuth><LoggedLayout><ServicesPage/></LoggedLayout></RequireAuth>}/>
        <Route path="/services/:name" element={<RequireAuth><LoggedLayout><ServiceDetailPage/></LoggedLayout></RequireAuth>}/>
        <Route path="/settings" element={<RequireAuth><LoggedLayout><SettingsPage/></LoggedLayout></RequireAuth>}/>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}