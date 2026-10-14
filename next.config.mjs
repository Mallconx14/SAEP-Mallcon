const nextConfig = {
  async rewrites() {
    return [{ source: "/loja/:path*", destination: "http://localhost:3001/loja/:path*" }];
  },
};
export default nextConfig;