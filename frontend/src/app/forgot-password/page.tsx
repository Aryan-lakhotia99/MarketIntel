"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, Check, X, ShieldAlert, Key, Eye, EyeOff, TrendingUp } from "lucide-react";

export default function ForgotPasswordPage() {
  const { forgotPassword, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: request token, 2: input token and new password
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Live password checks
  const [pwdChecks, setPwdChecks] = useState({
    length: false,
    number: false,
    special: false,
  });

  useEffect(() => {
    setPwdChecks({
      length: newPassword.length >= 8,
      number: /\d/.test(newPassword),
      special: /[!@#$%^&*()_+=\-[\]{}|;:',.<>?/]/.test(newPassword),
    });
  }, [newPassword]);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email) {
      setErrorMsg("Please enter your email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const recoveryToken = await forgotPassword(email);
      setSuccessMsg("If this account exists, a recovery token has been generated.");
      
      // Auto-prefill the token if returned by the local dev API for easy testing
      if (recoveryToken) {
        setToken(recoveryToken);
      }
      
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate password recovery.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!token || !newPassword || !confirmPassword) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (!pwdChecks.length || !pwdChecks.number || !pwdChecks.special) {
      setErrorMsg("Password does not meet the security criteria.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(email, token, newPassword);
      // AuthContext will redirect to login upon success
    } catch (err: any) {
      setErrorMsg(err.message || "Could not reset password. Please check your token.");
    } finally {
      setIsSubmitting(false);
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

        {/* Glassmorphic Card */}
        <div className="glass-strong rounded-3xl border border-white/10 shadow-2xl p-8 backdrop-blur-2xl">
          {step === 1 ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Recover Password</h2>
                <p className="text-xs text-slate-400 mt-1">Request a temporary auth override key.</p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleRequestToken} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Account Email
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
                      "Send Recovery Code"
                    )}
                  </div>
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white">Reset Credentials</h2>
                <p className="text-xs text-slate-400 mt-1">Enter your recovery token and define a new passcode.</p>
              </div>

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div>
                    <p className="font-semibold">Reset code initialized!</p>
                    <p className="text-[10px] text-emerald-500/80 mt-0.5">
                      The security code was printed to the API backend logs. We pre-filled it below for local testing.
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* Pre-filled Account Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-[#080d19]/40 border border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-500 font-sans cursor-not-allowed"
                  />
                </div>

                {/* Token Field */}
                <div className="space-y-1.5">
                  <label htmlFor="token" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Recovery Token
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Key className="h-4 w-4" />
                    </div>
                    <input
                      id="token"
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="e.g. 5D8FA39E"
                      className="w-full bg-[#080d19]/85 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono tracking-widest"
                      required
                    />
                  </div>
                </div>

                {/* New Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="newPassword" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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

                  {/* Password strength indicators */}
                  <div className="pt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {pwdChecks.length ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <X className="h-3 w-3 text-slate-600" />
                      )}
                      <span className={`text-[10px] font-medium ${pwdChecks.length ? "text-emerald-400" : "text-slate-500"}`}>
                        8+ characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {pwdChecks.number ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <X className="h-3 w-3 text-slate-600" />
                      )}
                      <span className={`text-[10px] font-medium ${pwdChecks.number ? "text-emerald-400" : "text-slate-500"}`}>
                        At least 1 digit
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {pwdChecks.special ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <X className="h-3 w-3 text-slate-600" />
                      )}
                      <span className={`text-[10px] font-medium ${pwdChecks.special ? "text-emerald-400" : "text-slate-500"}`}>
                        1 special char
                      </span>
                    </div>
                  </div>
                </div>

                {/* Confirm New Password Field */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#080d19]/85 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans"
                      required
                    />
                  </div>
                </div>

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
                      "Reset Password"
                    )}
                  </div>
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center text-xs">
            <span className="text-slate-500">Remember credentials? </span>
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
