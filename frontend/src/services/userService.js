import api from "./api";

// Cập nhật thông tin người dùng
export const updateProfile = (payload) => {
  return api.put("/users/profile", payload);
};