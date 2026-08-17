import { useState, useEffect } from "react";

// ==================================================
// DEVICE TYPE DETECTION HOOK
// ==================================================
// Detects whether the user is on mobile or desktop
// using media queries + user agent. Updates in real-time
// on window resize.
// ==================================================

const useDeviceType = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 768px)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const handleChange = (e) => {
      setIsMobile(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Also check user agent for initial load
    const ua = navigator.userAgent || "";
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    if (isMobileUA && !mediaQuery.matches) {
      setIsMobile(true);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return {
    isMobile,
    deviceIcon: isMobile ? "lucide:smartphone" : "lucide:monitor",
    deviceLabel: isMobile ? "Phone" : "Computer",
  };
};

export default useDeviceType;
