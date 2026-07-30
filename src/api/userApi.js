import api from "./axios";
import { verify } from "./authApi";

// Backend has /api/auth/verify instead of /api/users/me.
// It returns the current user based on the JWT.
export const getCurrentUser = () => verify();

// The following endpoints do not exist on the backend.
// Kept as rejected promises so calling code fails loudly rather than silently.
export const getUserById = (id) => Promise.reject(new Error("Not implemented on backend"));
export const getUsers = () => Promise.reject(new Error("Not implemented on backend"));
export const updateProfile = (data) => Promise.reject(new Error("Not implemented on backend"));
export const uploadProfilePhoto = (formData) => Promise.reject(new Error("Not implemented on backend"));
export const followUser = (id) => Promise.reject(new Error("Not implemented on backend"));
export const unfollowUser = (id) => Promise.reject(new Error("Not implemented on backend"));
export const searchUsers = (keyword) => Promise.reject(new Error("Not implemented on backend"));