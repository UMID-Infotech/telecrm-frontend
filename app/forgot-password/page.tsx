// teleCRM/app/forgot-password/page.tsx
//
// Fully self-contained forgot-password wizard.
// Uses its own dedicated backend routes:
//   POST /forgot-password/request   ← send OTP
//   POST /forgot-password/verify    ← check OTP (does NOT clear it)
//   POST /forgot-password/reset     ← set new password (clears OTP)
//   POST /forgot-password/resend    ← fresh OTP
//
// Never touches /auth/set-password or /auth/verify-otp —
// those belong exclusively to the first-time onboarding flow.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound, Lock } from "lucide-react";

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ── Step 1: request OTP ──────────────────────────────────────────────────
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/forgot-password/request", { email });
      setSuccessMsg("OTP sent! Check your inbox (and spam folder).");
      setStep("otp");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: verify OTP via API ───────────────────────────────────────────
  //    /forgot-password/verify does NOT null the OTP in DB,
  //    so /forgot-password/reset can still consume it in step 3.
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("Please enter the full 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      await api.post("/forgot-password/verify", { email, otp });
      setSuccessMsg("");
      setStep("password");
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message || "Invalid or expired OTP";
      setError(msg);
      // Clear OTP input so user doesn't retry the same invalid value
      setOtp("");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 3: reset password ───────────────────────────────────────────────
  //    /forgot-password/reset re-verifies the OTP atomically + sets password.
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/forgot-password/reset", {
        email,
        otp,
        newPassword: password,
      });
      router.push("/login?passwordReset=true");
    } catch (err: any) {
      const msg: string =
        err?.response?.data?.message || "Failed to reset password";

      // OTP expired between step 2 and step 3 — go back to OTP entry
      setOtp("");
      setPassword("");
      setConfirm("");
      setStep("otp");
      setError(msg + " — please enter the OTP again or request a new one.");
    } finally {
      setLoading(false);
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  async function handleResend() {
    setResending(true);
    setError("");
    try {
      await api.post("/forgot-password/resend", { email });
      setOtp("");
      setSuccessMsg("A new OTP has been sent to your email.");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to resend OTP");
    } finally {
      setResending(false);
    }
  }

  // ── Step indicators ───────────────────────────────────────────────────────
  const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
    { id: "email", label: "Email", icon: <Mail className="w-3.5 h-3.5" /> },
    { id: "otp", label: "Verify", icon: <KeyRound className="w-3.5 h-3.5" /> },
    { id: "password", label: "Reset", icon: <Lock className="w-3.5 h-3.5" /> },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4">
      <Card className="w-full max-w-sm bg-zinc-900 border-zinc-800">
        <CardHeader className="space-y-4">
          {/* Step progress */}
          <div className="flex items-center gap-0">
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-colors shrink-0
                    ${
                      i < stepIndex
                        ? "bg-red-600 text-white"
                        : i === stepIndex
                          ? "bg-red-600 text-white ring-2 ring-red-600/30"
                          : "bg-zinc-800 text-zinc-500"
                    }`}
                >
                  {s.icon}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-px flex-1 mx-1 transition-colors ${
                      i < stepIndex ? "bg-red-600" : "bg-zinc-700"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div>
            <CardTitle className="text-zinc-100">
              {step === "email" && "Forgot Password"}
              {step === "otp" && "Enter OTP"}
              {step === "password" && "New Password"}
            </CardTitle>
            <CardDescription className="text-zinc-400 mt-1">
              {step === "email" &&
                "Enter your account email and we'll send you a reset OTP."}
              {step === "otp" && `Enter the 6-digit OTP sent to ${email}.`}
              {step === "password" && "Choose a strong new password."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {successMsg && (
            <p className="text-green-400 text-sm bg-green-950/40 border border-green-800/50 rounded-md px-3 py-2">
              ✓ {successMsg}
            </p>
          )}
          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-800/50 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          {/* ── Step 1: Email ── */}
          {step === "email" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to login
                </Link>
              </div>
            </form>
          )}

          {/* ── Step 2: OTP ── */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Input
                placeholder="6-digit OTP"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                required
                maxLength={6}
                autoFocus
                className="bg-zinc-800 border-zinc-700 text-zinc-100 tracking-widest text-center text-xl placeholder:tracking-normal placeholder:text-base placeholder:text-zinc-500"
              />
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={otp.length !== 6 || loading}
              >
                {loading ? "Verifying..." : "Continue"}
              </Button>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                    setSuccessMsg("");
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Change email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm text-zinc-400 hover:text-zinc-200 underline transition-colors"
                >
                  {resending ? "Sending..." : "Resend OTP"}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: New Password ── */}
          {step === "password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* New password */}
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="New password (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Confirm password */}
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 pr-10 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 hover:text-zinc-200 transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= (i + 1) * 3
                          ? password.length >= 12
                            ? "bg-green-500"
                            : password.length >= 8
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Saving..." : "Reset Password"}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("otp");
                  setOtp("");
                  setPassword("");
                  setConfirm("");
                  setError("");
                }}
                className="w-full inline-flex items-center justify-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Re-enter OTP
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
