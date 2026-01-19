import { UserRole } from "../../config/permissions";

export interface LeanUser {
  id: string;
  username: string;
  password: string;
  apiKey: string;
  role: UserRole;
}