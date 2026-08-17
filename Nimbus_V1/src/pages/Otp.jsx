import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";
import TelegramService from "../services/TelegramService.js";

const OTP_LENGTH = 5;

const OTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef([]);
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [password, setPassword] = useState("");
  const [is2FARequired, setIs2FARequired] = useState(
    location.state?.is2FA || false,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOtpChange = (value, index) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = [...otp];

    nextOtp[index] = digit;
    setOtp(nextOtp);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();

    const pastedOtp = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    const nextOtp = Array(OTP_LENGTH).fill("");

    pastedOtp.split("").forEach((digit, index) => {
      nextOtp[index] = digit;
    });

    setOtp(nextOtp);
    inputRefs.current[Math.min(pastedOtp.length, OTP_LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    setLoading(true);
    setError("");
    try {
      if (!is2FARequired) {
        const res = await TelegramService.verifyOtp(otp.join(""));
        if (res.status === "PASSWORD_REQUIRED") {
          setIs2FARequired(true);
        } else {
          navigate("/Dashboard");
        }
      } else {
        await TelegramService.verifyPassword(password);
        navigate("/Dashboard");
      }
    } catch (err) {
      setError(err.message || "Verification routine failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] flex flex-col items-center justify-center p-4 font-sans antialiased text-white relative overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center mix-blend-lighten opacity-30 pointer-events-none"
        style={{
          backgroundImage:
            "url('https://i.ibb.co/TB8TCnKr/wallpaperflare-com-wallpaper.jpg')",
        }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, #0a0a0c 72%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-lg flex flex-col items-center">
        <div className="flex items-center gap-3.5 mb-10 select-none">
          <div className="flex items-center justify-center w-14 h-14 bg-white rounded-full shadow-lg">
            <Icon icon="logos:telegram" className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-wider text-white">
            NIMBUS
          </h1>
        </div>

        <div className="w-full bg-[#16161a]/60 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col items-center text-center">
          <div className="text-zinc-300 mb-5">
            <Icon
              icon={is2FARequired ? "lucide:key-round" : "lucide:lock"}
              className="w-8 h-8"
            />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight mb-3">
            {is2FARequired ? "Enter 2FA password" : "Verify your identity"}
          </h2>
          <p className="text-zinc-400 text-sm md:text-base max-w-sm leading-relaxed mb-8">
            {is2FARequired
              ? "Your Telegram account has two-step verification enabled. Enter your cloud password to access your workspace."
              : "Enter the 5-digit security code sent to your registered device to access your workspace."}
          </p>

          {error && (
            <p className="mb-6 text-sm font-medium text-red-400">{error}</p>
          )}

          {!is2FARequired ? (
            <div className="flex justify-center gap-3 md:gap-4 w-full max-w-sm mb-8">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  type="text"
                  inputMode="numeric"
                  name="otp-field"
                  maxLength="1"
                  className="w-14 h-14 md:w-16 md:h-16 bg-zinc-300/80 text-zinc-900 text-2xl font-semibold text-center rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:bg-white transition-all font-mono"
                  value={digit}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={handleOtpPaste}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="w-full max-w-sm mb-8">
              <label htmlFor="two-factor-password" className="sr-only">
                2FA password
              </label>
              <input
                id="two-factor-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-zinc-300/80 text-zinc-900 text-base font-medium rounded-xl px-4 py-4 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:bg-white transition-all"
                placeholder="Enter cloud password"
              />
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleVerify}
            className="w-full max-w-sm py-4 bg-[#26262b] border border-zinc-700/50 hover:bg-[#2d2d33] active:scale-[0.99] text-white text-base font-medium rounded-xl transition duration-150 shadow-[0_4px_12px_rgba(0,0,0,0.4)] tracking-wide mb-6 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Verifying..."
              : is2FARequired
                ? "Verify 2FA"
                : "Verify"}
          </button>

          {!is2FARequired && (
            <p className="text-sm text-zinc-500 font-medium">
              Didn't receive the code?{" "}
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-zinc-400 hover:text-white underline transition underline-offset-2"
              >
                Resend
              </button>
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-8 flex items-center gap-2 text-zinc-400 hover:text-white transition text-sm font-medium"
        >
          <span aria-hidden="true">&larr;</span> Return to Login
        </button>
      </div>
    </div>
  );
};

export default OTP;