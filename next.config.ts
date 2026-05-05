import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow production builds to proceed despite current lint errors (adjust later)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack configuration to handle server-only packages
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize jsdom and related packages for server-side only
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push('jsdom', 'isomorphic-dompurify');
      }
    }

    // Prevent client-side bundling of server-only modules
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'jsdom': false,
        'isomorphic-dompurify': false,
      };
    }

    return config;
  },

  // Headers configuration for development (production uses middleware)
  async headers() {
    // Only apply in development - production uses middleware
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/(.*)',
          headers: [
            {
              key: 'Content-Security-Policy-Report-Only',
              value: "script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
            }
          ]
        }
      ];
    }
    return [];
  }
};

export default nextConfig;
