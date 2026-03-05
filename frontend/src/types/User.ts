export interface User {
  username: string;
  apiKey: string;
  role: 'ADMIN' | 'USER';
}