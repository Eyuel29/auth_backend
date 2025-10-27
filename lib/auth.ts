import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { wechatOAuth } from './plugins/wechat-oauth';
import env from '@/env';

export const auth = betterAuth({
  appName: 'Auth Demo',
  database: memoryAdapter({}),
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
