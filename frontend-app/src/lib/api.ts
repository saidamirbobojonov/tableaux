import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/token/", { email, password }),
  refresh: (refresh: string) =>
    api.post("/auth/token/refresh/", { refresh }),
  me: () => api.get("/auth/me/"),
  branch: (branchId: string) => api.get(`/auth/branches/${branchId}/`),
};

export const analyticsApi = {
  getDashboard: (branchId: string, from?: string, to?: string) =>
    api.get("/analytics/dashboard/", { params: { branch_id: branchId, from, to } }),
};

export const ordersCreateApi = {
  create: (data: Record<string, unknown>) => api.post("/orders/", data),
  addTip: (id: string, tip_amount: number) => api.patch(`/orders/${id}/`, { tip_amount }),
};

export const ordersApi = {
  list: (branchId: string, params?: Record<string, string>) =>
    api.get("/orders/", { params: { branch_id: branchId, ...params } }),
  detail: (id: string) => api.get(`/orders/${id}/`),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/orders/${id}/`, data),
  pay: (id: string, payment_method: string) =>
    api.post(`/orders/${id}/pay/`, { payment_method }),
};

export const kitchenApi = {
  board: (branchId: string) =>
    api.get("/kitchen/board/", { params: { branch_id: branchId } }),
  updateStatus: (orderId: string, status: string) =>
    api.post(`/kitchen/orders/${orderId}/status/`, { status }),
};

export const shiftsApi = {
  open: (branchId: string, amount: number) =>
    api.post("/shifts/action/", { action: "OPEN", branch_id: branchId, amount }),
  close: (branchId: string, amount: number) =>
    api.post("/shifts/action/", { action: "CLOSE", branch_id: branchId, amount }),
  current: (branchId: string) =>
    api.get("/shifts/current/", { params: { branch_id: branchId } }),
};

export const tablesApi = {
  list: (branchId: string) => api.get(`/auth/branches/${branchId}/tables/`),
  create: (branchId: string, data: { number: string; name?: string; capacity?: number }) =>
    api.post(`/auth/branches/${branchId}/tables/`, data),
  update: (branchId: string, tableId: string, data: Record<string, unknown>) =>
    api.patch(`/auth/branches/${branchId}/tables/${tableId}/`, data),
  delete: (branchId: string, tableId: string) =>
    api.delete(`/auth/branches/${branchId}/tables/${tableId}/`),
};

export const settingsApi = {
  // Branch
  getBranch: (branchId: string) => api.get(`/auth/branches/${branchId}/manage/`),
  updateBranch: (branchId: string, data: FormData) =>
    api.patch(`/auth/branches/${branchId}/manage/`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  // Schedule
  getSchedule: (branchId: string) => api.get(`/auth/branches/${branchId}/schedule/`),
  updateSchedule: (branchId: string, data: unknown[]) =>
    api.put(`/auth/branches/${branchId}/schedule/`, data),
  // Categories
  getCategories: () => api.get("/catalog/admin/categories/"),
  createCategory: (data: FormData) =>
    api.post("/catalog/admin/categories/", data, { headers: { "Content-Type": "multipart/form-data" } }),
  updateCategory: (id: string, data: FormData) =>
    api.patch(`/catalog/admin/categories/${id}/`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteCategory: (id: string) => api.delete(`/catalog/admin/categories/${id}/`),
  // Menu Items
  getItems: () => api.get("/catalog/admin/items/"),
  createItem: (data: FormData) =>
    api.post("/catalog/admin/items/", data, { headers: { "Content-Type": "multipart/form-data" } }),
  updateItem: (id: string, data: FormData) =>
    api.patch(`/catalog/admin/items/${id}/`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  deleteItem: (id: string) => api.delete(`/catalog/admin/items/${id}/`),
  // Allergens
  getAllergens: () => api.get("/catalog/admin/allergens/"),
  createAllergen: (data: { name: string }) => api.post("/catalog/admin/allergens/", data),
  updateAllergen: (id: number, data: { name: string }) => api.patch(`/catalog/admin/allergens/${id}/`, data),
  deleteAllergen: (id: number) => api.delete(`/catalog/admin/allergens/${id}/`),
  // Modifier Groups
  getModifierGroups: () => api.get("/catalog/admin/modifier-groups/"),
  createModifierGroup: (data: unknown) => api.post("/catalog/admin/modifier-groups/", data),
  updateModifierGroup: (id: number, data: unknown) => api.patch(`/catalog/admin/modifier-groups/${id}/`, data),
  deleteModifierGroup: (id: number) => api.delete(`/catalog/admin/modifier-groups/${id}/`),
};

export const staffApi = {
  list: () => api.get("/auth/staff/"),
  invite: (data: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
    password: string;
  }) => api.post("/auth/staff/", data),
  update: (membershipId: string, data: { role?: string; is_active?: boolean }) =>
    api.patch(`/auth/staff/${membershipId}/`, data),
  remove: (membershipId: string) => api.delete(`/auth/staff/${membershipId}/`),
};
