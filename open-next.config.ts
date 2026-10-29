// OpenNext configuration for Cloudflare Workers
export interface OpenNextConfig {
  default: {
    override?: {
      wrapper?: string;
      converter?: string;
      incrementalCache?: string;
      tagCache?: string;
      queue?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },
};

export default config;
