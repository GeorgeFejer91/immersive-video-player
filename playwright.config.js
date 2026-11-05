import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: '*.spec.js', workers: 1, timeout: 60000,
  use: { baseURL: process.env.TEST_URL || 'http://127.0.0.1:4174', launchOptions: { args: ['--autoplay-policy=document-user-activation-required'] } },
  reporter: 'list', outputDir: '.for-ai-local/browser-results',
  webServer: process.env.TEST_URL ? undefined : { command:'npm run preview -- --port 4174',url:'http://127.0.0.1:4174',reuseExistingServer:!process.env.CI }
});
