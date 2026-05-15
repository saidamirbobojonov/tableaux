"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "./api";

interface BranchData {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  phone: string;
  logo: string | null;
  cover_image: string | null;
  currency: string;
  timezone: string;
}

interface UserData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  role: string | null;
  organization: string | null;
}

interface AppData {
  branch: BranchData | null;
  user: UserData | null;
  loading: boolean;
}

const AppDataContext = createContext<AppData>({ branch: null, user: null, loading: true });

const BRANCH_ID = process.env.NEXT_PUBLIC_DEFAULT_BRANCH_ID ?? "";

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [branch, setBranch] = useState<BranchData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }

    Promise.all([
      authApi.me().then((r) => setUser(r.data)).catch(() => {}),
      authApi.branch(BRANCH_ID).then((r) => setBranch(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <AppDataContext.Provider value={{ branch, user, loading }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext);
}
