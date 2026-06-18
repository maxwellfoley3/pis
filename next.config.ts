import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow browsing the dev server over the Tailscale IP (phone + laptop) without
  // cross-origin HMR being blocked.
  allowedDevOrigins: ["100.86.175.73"],
};

export default nextConfig;
