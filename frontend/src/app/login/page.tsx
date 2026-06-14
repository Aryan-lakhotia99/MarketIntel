"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Eye, EyeOff, Mail, Lock, TrendingUp, Loader2 } from "lucide-react";
import { initiateGoogleOAuth } from "@/app/actions/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  React.useEffect(() => {
    const savedEmail = localStorage.getItem("remembered_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
      } else {
        localStorage.removeItem("remembered_email");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setIsGoogleLoading(true);
    try {
      // Server Action — initiates PKCE OAuth flow via InsForge,
      // stores code verifier in httpOnly cookie, then redirects to Google.
      await initiateGoogleOAuth();
    } catch (err: any) {
      // redirect() throws internally; only catch real errors
      if (!err?.message?.includes("NEXT_REDIRECT")) {
        setErrorMsg(err.message || "Failed to start Google sign-in.");
        setIsGoogleLoading(false);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#030712]">
      {/* Cinematic grid background effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
      
      <div className="w-full max-w-md z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/30 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.25)] mb-3">
            <TrendingUp className="h-6 w-6 text-indigo-400" />
            <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Market<span className="text-indigo-400">Intel</span>
          </h1>
          <p className="text-[10px] tracking-widest text-slate-500 uppercase mt-1">
            Secure Terminal Gateway
          </p>
        </div>

        {/* Glassmorphic Auth Card */}
        <div className="glass-strong rounded-3xl border border-white/10 shadow-2xl p-8 backdrop-blur-2xl relative overflow-hidden">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Initialize Session</h2>
            <p className="text-xs text-slate-400 mt-1">Enter credentials to establish a secure link.</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#080d19]/85 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#080d19]/85 border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className="flex items-center gap-2 text-slate-400 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/10 bg-[#080d19] text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                />
                Remember user
              </label>
              <Link
                href="/forgot-password"
                className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full relative mt-4 group cursor-pointer"
            >
              <div className="absolute inset-0 bg-indigo-600 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2.5 rounded-xl border border-indigo-400/20 active:scale-[0.99] transition-all duration-200">
                {isSubmitting ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  "Initialize Session"
                )}
              </div>
            </button>
          </form>

          {/* Social Sign-In Section */}
          <div className="mt-5 space-y-4">
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] font-mono tracking-widest text-slate-500 uppercase">Or Continue With</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* ── Production Google OAuth button ────────────────────────── */}
            {/* Triggers InsForge PKCE flow → Google consent → /api/auth/callback */}
            <button
              type="button"
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading}
              className="w-full flex items-center justify-center gap-2 bg-[#0c1220]/80 hover:bg-[#11192e] border border-white/10 rounded-xl py-2.5 text-xs font-semibold text-slate-200 transition-all hover:border-white/20 active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-wait"
            >
              {isGoogleLoading ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-indigo-400" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {isGoogleLoading ? "Redirecting to Google…" : "Continue with Google"}
            </button>
          </div>

          <div className="mt-6 text-center text-xs">
            <span className="text-slate-500">New to MarketIntel? </span>
            <Link
              href="/signup"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
