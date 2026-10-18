declare global {
  /** The release this build is, set by vite.config.ts; "dev" outside a release build. */
  const __WEB_VERSION__: string;
  /** The public address of the landing page, set at build time; empty keeps search engines out. */
  const __SITE_URL__: string;
}

export {};
