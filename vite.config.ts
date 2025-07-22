import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ command, mode }) => {
  // Check if we're building for Netlify using command line argument or environment
  const isNetlify = process.argv.includes('--mode=netlify') || 
                   process.env.NODE_ENV === 'netlify' ||
                   process.env.NETLIFY === 'true';
  
  return {
    base: isNetlify ? '/' : '/workschedule/',
    plugins: [react()],
    resolve: {
      alias: [{ find: "@", replacement: path.resolve(__dirname, "./src") }],
    },
  };
});
