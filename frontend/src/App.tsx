import { AuthProvider } from "./contexts/AuthContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { OrganizationProvider } from "./contexts/OrganizationContext";
import { SpaceRouter } from "./router/router";

export default function App(){
  return (
    <OrganizationProvider>
      <AuthProvider>
        <SettingsProvider>
          <SpaceRouter />
        </SettingsProvider>
      </AuthProvider>
    </OrganizationProvider>
  )
}