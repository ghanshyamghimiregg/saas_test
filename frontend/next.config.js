/** @type {import('next').NextConfig} */
const nextConfig = {
  // Subdomain routing handled in middleware.ts
  // No rewrites needed — middleware maps host → app prefix
};

module.exports = nextConfig;
