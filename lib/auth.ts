import { betterAuth } from 'better-auth';
import { wechatOAuth } from './plugins/wechat-oauth';
import env from '@/env';
import Database from "better-sqlite3";

export const auth = betterAuth({
  appName: 'Auth Demo',
  database: new Database("database.sqlite"),
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 60 },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 0,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ['wechat'] },
  },
  plugins: [
    ...(env.WECHAT_OAUTH_CLIENT_ID && env.WECHAT_OAUTH_CLIENT_SECRET
      ? [
          wechatOAuth({
            appId: env.WECHAT_OAUTH_CLIENT_ID,
            appSecret: env.WECHAT_OAUTH_CLIENT_SECRET,
            lang: 'cn',
          }),
        ]
      : []),
  ],
  onAPIError: {
    errorURL: '/auth/error',
    onError: (error) => {
      console.error('auth error:', error);
    },
  },
  secret: env.BETTER_AUTH_SECRET,
});
