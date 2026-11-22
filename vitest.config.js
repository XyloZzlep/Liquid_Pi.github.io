import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      SESSION_SECRET: 'a'.repeat(40),
      ADMIN_EMAIL: 'admin@liquidpi.test',
      GOOGLE_CLIENT_ID: 'id-de-prueba.apps.googleusercontent.com',
      GOOGLE_CLIENT_SECRET: 'secreto-de-prueba',
    },
  },
});