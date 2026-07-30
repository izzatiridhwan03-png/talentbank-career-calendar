"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "talentbank123";
const STORAGE_KEY = "isAdminLoggedIn";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem(STORAGE_KEY) === "true";
    if (isLoggedIn) {
      router.replace("/admin/dashboard");
      return;
    }
    setLoading(false);
  }, [router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "true");
      router.push("/admin/dashboard");
      return;
    }

    setError("Invalid username or password.");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-brand-cream text-brand-brown">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-brand-sage/60 p-6 shadow-sm">
        <h1 className="font-heading text-2xl font-semibold mb-4 text-brand-brown">Admin Login</h1>
        <form onSubmit={handleSubmit}>
          <label className="block mb-3">
            <span className="text-sm font-medium text-brand-brown/80">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 block w-full rounded-md border border-brand-sage px-3 py-2 text-brand-brown focus:border-brand-brown focus:outline-none"
            />
          </label>
          <label className="block mb-4">
            <span className="text-sm font-medium text-brand-brown/80">Password</span>
            <div className="relative mt-1">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="block w-full rounded-md border border-brand-sage px-3 py-2 pr-10 text-brand-brown focus:border-brand-brown focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-brown/60"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <path d="M17.94 17.94A10.986 10.986 0 0112 19.5C6.48 19.5 2 14.99 2 12c.56-1.01 1.33-1.97 2.28-2.82" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.88 9.88a3 3 0 014.24 4.24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 22l-4-4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-5 w-5">
                    <path d="M1.05 12c.56-1.01 1.33-1.97 2.28-2.82A10.986 10.986 0 0112 4.5c5.52 0 10 4.51 10 7.5s-4.48 7.5-10 7.5c-1.94 0-3.76-.55-5.31-1.5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M15 12a3 3 0 10-3 3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            </div>
          </label>
          {error ? <p className="text-sm text-red-600 mb-4">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-md bg-brand-brown text-brand-cream py-2 font-semibold hover:bg-brand-browndark"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
