// src/utils/auth.js
// Single source of truth for reading/writing auth state.
// All pages import from here — never read localStorage directly.

export function getUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
}

export function getArtist() {
  try { return JSON.parse(localStorage.getItem("artist") || "null"); } catch { return null; }
}

export function getToken() {
  return localStorage.getItem("token") || null;
}

/** Returns the logged-in account regardless of role */
export function getCurrentAccount() {
  return getArtist() || getUser();
}

export function isLoggedIn() {
  return !!(getToken() && getCurrentAccount());
}

export function isArtist() {
  const a = getArtist();
  const u = getUser();
  if (a?.role === "artist") return true;
  if (u?.role === "artist") return true;
  return false;
}

/**
 * Persist login response from any auth endpoint.
 * Puts the data in the right localStorage key based on role.
 */
export function saveAuth(token, user) {
  localStorage.setItem("token", token);
  if (user?.role === "artist") {
    localStorage.setItem("artist", JSON.stringify(user));
    localStorage.removeItem("user");
  } else {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.removeItem("artist");
  }
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("artist");
}