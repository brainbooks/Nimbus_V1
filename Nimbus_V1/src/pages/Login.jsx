import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import countries from "../data/countries.json";
import { Icon } from "@iconify/react";
import TelegramService from "../services/TelegramService.js";
import { QRCodeSVG } from "qrcode.react";

const Login = () => {
  const navigate = useNavigate();
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [loadingQr, setLoadingQr] = useState(true);

  useEffect(() => {
    let pollInterval;
    let refreshTimeout;

    const setupQrLogin = async () => {
      try {
        setLoadingQr(true);
        const data = await TelegramService.generateQrToken();

        if (data.url) {
          setQrUrl(data.url);
          setLoadingQr(false);

          // Calculate time to expiration (convert to ms) and refresh slightly early
          const delay =
            (data.expires - Math.floor(Date.now() / 1000)) * 1000 - 2000;
          refreshTimeout = setTimeout(setupQrLogin, Math.max(delay, 5000));

          // Start polling the MTProto channel to check status
          clearInterval(pollInterval);
          pollInterval = setInterval(async () => {
            try {
              const status = await TelegramService.checkQrSessionStatus();

              if (status.status === "SUCCESS") {
                clearInterval(pollInterval);
                clearTimeout(refreshTimeout);
                navigate("/Dashboard");
              } else if (status.status === "PASSWORD_REQUIRED") {
                clearInterval(pollInterval);
                clearTimeout(refreshTimeout);
                navigate("/OTP", { state: { is2FA: true } });
              }
              // CATCH THE DC SWITCH EVENTS HERE:
              else if (status.status === "MIGRATED") {
                clearInterval(pollInterval);
                clearTimeout(refreshTimeout);
                console.log(
                  "DC migration completed. Regenerating fresh regional QR endpoint...",
                );
                setupQrLogin(); // Re-trigger the parent sequence to render the correct DC token code!
              }
            } catch (err) {
              console.error("Polling check failed:", err);
            }
          }, 3000);
        }
      } catch (err) {
        console.error("Failed to generate login QR:", err);
      }
    };

    setupQrLogin();

    // Clean up long-lived timers when component unmounts
    return () => {
      clearInterval(pollInterval);
      clearTimeout(refreshTimeout);
    };
  }, [navigate]);

  const handleLogin = async () => {
    if (!phone) return setError("Please enter your phone number.");
    setLoading(true);
    setError("");
    try {
      // Assemble standard absolute international dialing parameter layouts
      const fullPhoneNumber = `${selectedCountry.dialCode}${phone}`.replace(
        /\s+/g,
        "",
      );
      await TelegramService.sendOtp(fullPhoneNumber);
      navigate("/OTP");
    } catch (err) {
      setError(err.message || "Failed to process request authorization.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center font-sans antialiased text-white">
      <div className="flex flex-col md:flex-row bg-[#09090b] w-full max-w-6xl rounded-3xl overflow-hidden border border-zinc-800/50 shadow-2xl">
        <div
          className="md:w-1/2 p-8 md:p-16 flex flex-col items-center justify-center text-center relative min-h-100 md:min-h-175 bg-linear-to-b from-zinc-900 via-zinc-900 to-black border-b md:border-b-0 md:border-r border-zinc-800/50 m-3 rounded-2xl bg-cover bg-center mix-blend-lighten"
          style={{
            backgroundImage:
              "url('https://plain-apac-prod-public.komododecks.com/202607/17/gyK2DHbS8DZbOcq8NSol/image.jpg')",
          }}
        >
          {/* <div className="absolute inset-0 bg-[#09090b]/90 backdrop-blur-sm" /> */}
          <div className="absolute w-145 inset-0 bg-[#09090b]/97" />

          <div className="relative z-10 flex flex-col items-center max-w-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="relative flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-xl">
                <Icon icon="logos:telegram" className="w-12 h-12" />
              </div>
              <h1 className="text-4xl font-bold tracking-wider text-white">
                NIMBUS
              </h1>
            </div>

            <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-normal px-4">
              Experience the next generation of your enterprise workspace.
              Secure, intelligent, and designed for you.
            </p>
          </div>
        </div>

        <div className="md:w-1/2 p-8 md:p-16 flex flex-col justify-center bg-[#09090b]">
          <div className="w-full max-w-sm mx-auto space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">
                Welcome!
              </h2>
              <p className="text-zinc-500 text-sm leading-snug">
                Enter your phone number to access workspace <br />
                (Login via Telegram).
              </p>
            </div>

            <div className="space-y-5">
              {error && (
                <p className="text-sm font-medium text-red-400">{error}</p>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="country"
                  className="text-sm font-medium text-zinc-300"
                >
                  Country
                </label>
                <div className="relative bg-zinc-900/80 border rounded-xl focus-within:border-zinc-700 transition">
                  <select
                    id="country"
                    className="w-full appearance-none bg-transparent py-3.5 pl-4 pr-10 text-sm text-white focus:outline-none"
                    value={selectedCountry.code}
                    style={{ colorScheme: "dark" }}
                    onChange={(e) => {
                      const country = countries.find(
                        (item) => item.code === e.target.value,
                      );

                      if (country) {
                        setSelectedCountry(country);
                      }
                    }}
                  >
                    {countries.map((country) => (
                      <option
                        key={country.id}
                        value={country.code}
                        className="bg-[#09090b] text-white"
                        style={{ backgroundColor: "#09090b", color: "#fff" }}
                      >
                        {country.name} ({country.dialCode})
                      </option>
                    ))}
                  </select>
                  <Icon
                    icon="lucide:chevron-down"
                    className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-zinc-300"
                >
                  Phone Number
                </label>
                <div className="flex items-center bg-zinc-900/80 border rounded-xl focus-within:border-zinc-700 transition">
                  <span className="px-4 text-zinc-400 border-r border-zinc-800 text-sm font-medium font-mono">
                    {selectedCountry.dialCode}
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    maxLength="10"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full bg-transparent py-3.5 px-4 text-sm text-white focus:outline-none font-mono"
                    placeholder=""
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2.5">
                <input
                  type="checkbox"
                  id="remember"
                  checked={keepSignedIn}
                  onChange={() => setKeepSignedIn(!keepSignedIn)}
                  className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-zinc-700 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-zinc-500"
                />
                <label
                  htmlFor="remember"
                  className="text-xs text-zinc-400 select-none cursor-pointer"
                >
                  Keep me signed in
                </label>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleLogin}
              className="w-full py-3.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 active:scale-[0.99] text-white text-sm font-medium rounded-xl transition shadow-lg tracking-wide disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending..." : "Login"}
            </button>

            <div className="text-center">
              <span className="text-xs text-zinc-500 relative bg-[#09090b] px-3 z-10 font-medium">
                Or login with QR
              </span>
              <div className="h-px bg-zinc-800/80 w-full -mt-2" />
            </div>

            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-2xl shadow-xl inline-block border border-zinc-800/10">
                {loadingQr ? (
                  <div className="w-36 h-36 flex items-center justify-center text-center text-xs font-medium text-zinc-500">
                    Loading Session...
                  </div>
                ) : (
                  <QRCodeSVG
                    value={qrUrl}
                    size={144}
                    level="M"
                    includeMargin={false}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
