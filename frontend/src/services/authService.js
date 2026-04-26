import api from "./api";

// Lấy thông tin người dùng từ localStorage
export const getUserFromLocalStorage = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser || rawUser === "undefined") return null;
    return JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem("user");
    return null;
  }
};

// Đăng ký
export const register = (userData) => {
  return api.post("/users/register", userData);
};

// Đăng nhập
export const login = async (credentials) => {
  const response = await api.post("/users/login", credentials);

  if (response.data?.success && response.data?.data?.token && response.data?.data?.user) {
    localStorage.setItem("token", response.data.data.token); // Lưu token với key 'token'
    localStorage.setItem("user", JSON.stringify(response.data.data.user));
  }

  return response.data;
};

// Lấy user từ localStorage
export const getStoredUser = () => {
  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser || rawUser === "undefined") return null;
    return JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem("user");
    return null;
  }
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");  // Đảm bảo lấy 'token' đúng key
  console.log("Token trong localStorage:", token); // Debug: Kiểm tra token
  if (!token) return {}; // Nếu không có token, không gửi header
  return {
    Authorization: `Bearer ${token}`,
  };
};

// Đăng xuất
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};