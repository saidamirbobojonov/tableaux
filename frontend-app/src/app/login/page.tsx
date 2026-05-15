"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import ThemeToggle from "@/components/layout/ThemeToggle";

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      const { access, refresh } = res.data;
      // Store in both cookie (for middleware) and localStorage (for axios)
      setCookie("access_token", access);
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      router.push("/dashboard");
    } catch {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f7f6] dark:bg-[#1c1b16] flex items-center justify-center p-4 transition-colors duration-200">
      <div className="absolute top-5 right-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="size-14 rounded-full bg-[#a7a66c] flex items-center justify-center text-white mb-4">
            <span className="material-symbols-outlined text-3xl">restaurant</span>
          </div>
          <h1 className="text-2xl font-bold text-[#151513] dark:text-white">Restaurant Manager</h1>
          <p className="text-sm text-[#7b7b6f] dark:text-[#a3a396] mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white dark:bg-[#25241e] rounded-xl border border-[#e2e2df] dark:border-[#3a3930] shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 bg-[#f7f7f6] dark:bg-[#32312a] border border-[#e2e2df] dark:border-[#3a3930] rounded-lg text-sm text-[#151513] dark:text-white placeholder:text-[#7b7b6f] focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/50 focus:border-[#a7a66c] transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#7b7b6f] uppercase tracking-wider">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-[#f7f7f6] dark:bg-[#32312a] border border-[#e2e2df] dark:border-[#3a3930] rounded-lg text-sm text-[#151513] dark:text-white placeholder:text-[#7b7b6f] focus:outline-none focus:ring-2 focus:ring-[#a7a66c]/50 focus:border-[#a7a66c] transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#a7a66c] hover:bg-[#a7a66c]/90 disabled:opacity-60 text-white font-bold py-2.5 rounded-lg transition-all mt-1"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
