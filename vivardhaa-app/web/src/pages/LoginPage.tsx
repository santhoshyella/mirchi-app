import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Phone, ArrowRight, Loader2, RotateCcw, ChevronLeft } from "lucide-react";
import { authApi } from "@/lib/api";
import { setSessionUser, getSessionUser } from "@/lib/permissions";

const RESEND_SECONDS = 30;

export function LoginPage() {
  const navigate = useNavigate();

  // Step 1: phone | Step 2: otp
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resend timer
  const [resendCountdown, setResendCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startResendTimer() {
    setResendCountdown(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.requestOtp(phone);
      setStep("otp");
      setOtp("");
      startResendTimer();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      // Extract the NestJS message from the error string
      const match = msg.match(/\d{3}: (.+)$/);
      setError(match ? JSON.parse(match[1])?.message ?? match[1] : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token } = await authApi.verifyOtp(phone, otp);
      setSessionUser(token);
      navigate("/purchase", { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      const match = msg.match(/\d{3}: (.+)$/);
      setError(match ? JSON.parse(match[1])?.message ?? match[1] : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCountdown > 0) return;
    setError("");
    setLoading(true);
    try {
      await authApi.requestOtp(phone);
      setOtp("");
      startResendTimer();
    } catch {
      setError("Could not resend OTP. Try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Shared brand panel ──────────────────────────────────────────────────

  const BrandPanel = (
    <div className="hidden md:flex md:w-[52%] flex-col items-center justify-center relative overflow-hidden bg-white">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-5" style={{ background: "#00143c" }} />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-5" style={{ background: "#008c50" }} />

      <div className="relative z-10 flex flex-col items-center gap-8 px-10 text-center">
        <img
          src="/vivardhaa-logo.png"
          alt="Vivardhaa Global"
          className="w-56"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <p className="max-w-[280px] text-[14px] leading-relaxed text-slate-400">
          Continuous Improvement, Limitless Growth
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {["Purchase", "Destemming", "Raasi", "Orders"].map((m) => (
            <span key={m} className="rounded-full border px-3 py-1 text-[11px] font-semibold"
              style={{ borderColor: "#00143c22", color: "#00143c99" }}>
              {m}
            </span>
          ))}
        </div>
      </div>

      <p className="absolute bottom-6 text-[11px] text-slate-400">
        © {new Date().getFullYear()} Vivardhaa Global
      </p>
    </div>
  );

  // ── Step 1: Phone ────────────────────────────────────────────────────────

  if (step === "phone") {
    return (
      <div className="flex h-full min-h-screen">
        {BrandPanel}

        <div
          className="flex flex-1 flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
          style={{ background: "linear-gradient(155deg, #00143c 0%, #001f5a 60%, #00143c 100%)" }}
        >
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(240,80,0,0.10) 0%, transparent 70%)" }} />

          {/* Mobile logo */}
          <div className="mb-8 flex flex-col items-center md:hidden relative z-10">
            <img src="/vivardhaa-logo.png" alt="Vivardhaa" className="w-28 mb-3"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>

          <div className="relative z-10 w-full max-w-[380px]">
            <div className="mb-8">
              <h2 className="text-[26px] font-extrabold text-white leading-tight">Welcome back</h2>
              <p className="mt-1.5 text-[14px] text-slate-400">Enter your registered phone number.</p>
            </div>

            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold uppercase tracking-wide text-slate-400">Phone number</label>
                <div
                  className="flex items-center gap-2.5 rounded-xl border-[1.5px] px-4 py-3 transition-colors"
                  style={{
                    borderColor: error ? "#ef4444" : phone ? "#f05000" : "rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.07)",
                  }}
                >
                  <Phone size={15} className="flex-shrink-0 text-slate-400" />
                  <span className="text-[13px] font-semibold text-slate-400 border-r pr-2.5"
                    style={{ borderColor: "rgba(255,255,255,0.15)" }}>+91</span>
                  <input
                    type="tel" inputMode="numeric" maxLength={10} placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
                    className="flex-1 bg-transparent text-[15px] font-semibold text-white outline-none placeholder:font-normal placeholder:text-slate-500 tracking-wider"
                    autoFocus
                  />
                </div>
                {error && <p className="text-[12px] font-semibold text-red-400">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="mt-2 flex items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-bold text-white transition-all"
                style={{
                  background: loading || phone.length < 10 ? "rgba(255,255,255,0.15)" : "linear-gradient(135deg, #f05000 0%, #d04400 100%)",
                  cursor: loading || phone.length < 10 ? "not-allowed" : "pointer",
                  boxShadow: phone.length >= 10 && !loading ? "0 4px 18px rgba(240,80,0,0.45)" : "none",
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Send OTP</span><ArrowRight size={15} /></>}
              </button>
            </form>

            <p className="mt-6 text-center text-[12px] text-slate-500">
              Contact your admin if you don't have access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: OTP ──────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-screen">
      {BrandPanel}

      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-10 relative overflow-hidden"
        style={{ background: "linear-gradient(155deg, #00143c 0%, #001f5a 60%, #00143c 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 55%, rgba(240,80,0,0.10) 0%, transparent 70%)" }} />

        <div className="relative z-10 w-full max-w-[380px]">
          {/* Back */}
          <button
            onClick={() => { setStep("phone"); setError(""); setOtp(""); }}
            className="mb-6 flex items-center gap-1.5 text-[12px] font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={14} />
            Change number
          </button>

          <div className="mb-8">
            <h2 className="text-[26px] font-extrabold text-white leading-tight">Enter OTP</h2>
            <p className="mt-1.5 text-[14px] text-slate-400">
              Sent to <span className="font-bold text-white">+91 {phone}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold uppercase tracking-wide text-slate-400">6-digit OTP</label>
              <input
                type="tel" inputMode="numeric" maxLength={6} placeholder="• • • • • •"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                className="rounded-xl border-[1.5px] px-4 py-3 text-center text-[22px] font-bold tracking-[0.4em] text-white outline-none transition-colors placeholder:text-slate-600"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  borderColor: error ? "#ef4444" : otp.length === 6 ? "#f05000" : "rgba(255,255,255,0.15)",
                }}
                autoFocus
              />
              {error && <p className="text-[12px] font-semibold text-red-400">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="mt-2 flex items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-bold text-white transition-all"
              style={{
                background: loading || otp.length < 6 ? "rgba(255,255,255,0.15)" : "linear-gradient(135deg, #f05000 0%, #d04400 100%)",
                cursor: loading || otp.length < 6 ? "not-allowed" : "pointer",
                boxShadow: otp.length >= 6 && !loading ? "0 4px 18px rgba(240,80,0,0.45)" : "none",
              }}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Verify & Sign in</span><ArrowRight size={15} /></>}
            </button>
          </form>

          {/* Resend */}
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={handleResend}
              disabled={resendCountdown > 0 || loading}
              className="flex items-center gap-1.5 text-[12px] font-semibold transition-colors"
              style={{ color: resendCountdown > 0 ? "rgba(255,255,255,0.3)" : "#f05000", cursor: resendCountdown > 0 ? "default" : "pointer" }}
            >
              <RotateCcw size={12} />
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend OTP"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
