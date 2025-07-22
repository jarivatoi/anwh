import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ command, mode }) => {
  // Determine base path based on environment
  let basePath = '/';
  
  // Check for Netlify deployment
  const isNetlify = process.env.NETLIFY === 'true' || 
                   process.env.CONTEXT === 'production' ||
                   process.argv.includes('--mode=netlify');
  
  // Check for GitHub Pages deployment
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true' ||
                       process.env.CI === 'true' ||
                       command === 'build' && !isNetlify;
  
  if (isNetlify) {
    basePath = '/';
  } else if (isGitHubPages) {
    basePath = '/anwh/';
  } else {
    // Development mode
    basePath = '/anwh/';
  }
  
  console.log('🔧 Vite Config:', {
    command,
    mode,
    isNetlify,
    isGitHubPages,
    basePath,
    env: {
      NETLIFY: process.env.NETLIFY,
      GITHUB_ACTIONS: process.env.GITHUB_ACTIONS,
      CI: process.env.CI
    }
  });
  
  return {
    base: basePath,
    plugins: [react()],
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});