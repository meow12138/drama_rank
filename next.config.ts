import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // drama platforms
      { protocol: "https", hostname: "img.reelshort.com" },
      { protocol: "https", hostname: "**.shorttv.live" },
      { protocol: "https", hostname: "**.dramabox.com" },
      { protocol: "https", hostname: "**.flextv.cc" },
      { protocol: "https", hostname: "**.kalostv.com" },
      { protocol: "https", hostname: "**.reelshort.com" },
      { protocol: "https", hostname: "**.farsunpteltd.com" },
      { protocol: "https", hostname: "**.netshort.com" },
      { protocol: "https", hostname: "**.cdreader.com" },
      { protocol: "https", hostname: "**.goodshort.tv" },
      { protocol: "https", hostname: "**.topshort.tv" },
      { protocol: "https", hostname: "**.shortmax.com" },
      { protocol: "https", hostname: "**.mobireels.com" },
      // novel platforms
      { protocol: "https", hostname: "**.royalroadcdn.com" },
      { protocol: "https", hostname: "**.webnovel.com" },
      { protocol: "https", hostname: "www.scribblehub.com" },
      { protocol: "https", hostname: "img.webnovel.com" },
      { protocol: "https", hostname: "**.novelupdates.com" },
      { protocol: "https", hostname: "**.wattpad.com" },
      { protocol: "https", hostname: "**.tapas.io" },
    ],
  },
};

export default nextConfig;
