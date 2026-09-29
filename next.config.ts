import type { NextConfig } from "next"

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },

  {
    key: "X-Frame-Options",
    value: "DENY",
  },

  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },

  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=()",
  },

  {
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },

  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "connect-src 'self' https:",
      "media-src 'self' blob: https:",
      "object-src 'none'",
      "frame-src 'self' https:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },

  // Only enable HSTS in production
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value:
            "max-age=31536000; includeSubDomains; preload",
        },
      ]
    : []),
]

const nextConfig: NextConfig = {
  /*
   * Native Node.js packages
   *
   * @imgly/background-removal-node uses
   * onnxruntime-node internally.
   *
   * Keep these packages external instead of
   * letting Next/Turbopack bundle their native
   * binaries.
   */
  serverExternalPackages: [
    "onnxruntime-node",
    "@imgly/background-removal-node",
  ],

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig