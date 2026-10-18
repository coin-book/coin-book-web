import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // The app shell is the fallback; index.html, sk.html and en.html are the prerendered landing pages.
    adapter: adapter({ fallback: 'app.html', precompress: false }),
  },
};

export default config;
