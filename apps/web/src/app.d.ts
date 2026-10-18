declare global {
  /** The release this build is, set by vite.config.ts; "dev" outside a release build. */
  const __WEB_VERSION__: string;
}

export {};
