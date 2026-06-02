//teleCRM/lib/auth.ts
export function saveAuth(token: string, accessLevel: string) {
  localStorage.setItem("token", token);
  localStorage.setItem("accessLevel", accessLevel);
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessLevel");
}

export function getAccessLevel(): string | null {
  return localStorage.getItem("accessLevel");
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}