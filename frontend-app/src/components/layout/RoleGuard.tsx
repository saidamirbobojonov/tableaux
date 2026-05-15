"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppData } from "@/lib/AppDataContext";

interface RoleGuardProps {
  allowedRoles: string[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, loading } = useAppData();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user && !allowedRoles.includes(user.role ?? "")) {
      router.replace("/dashboard");
    }
  }, [loading, user, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-[#7b7b6f]">
        Loading...
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role ?? "")) {
    return null;
  }

  return <>{children}</>;
}
