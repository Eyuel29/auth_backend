import env from "@/env";
import { expo } from "@better-auth/expo";
import { betterAuth, type OAuth2Tokens } from "better-auth";
import { betterFetch } from "@better-fetch/fetch";
import { genericOAuth } from "better-auth/plugins";
import { Database } from "bun:sqlite";

export const auth = betterAuth({
  appName: "Auth Demo",
  trustedOrigins: [
    "authdemo://",
    "rndemo://",
    "exp://",
    "http://localhost:8081",
    "http://localhost:8080",
  ],
  baseURL: env.BASE_URL,
  database: new Database("database.sqlite"),
  session: {
    cookieCache: { enabled: true, maxAge: 60 * 60 },
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 0,
  },
  logger: {
    disabled: false,
    disableColors: false,
    level: "error",
    log: (level, message, ...args) => {
      console.log(`[${level}] ${message}`, ...args);
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    },
  },
  account: {
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  plugins: [
    expo(),
    genericOAuth({
      config: [
        {
          providerId: "wechat",
          clientId: env.WECHAT_OAUTH_CLIENT_ID,
          clientSecret: env.WECHAT_OAUTH_CLIENT_SECRET,
          authorizationUrl: "https://open.weixin.qq.com/connect/qrconnect",
          tokenUrl: "https://api.weixin.qq.com/sns/oauth2/access_token",
          userInfoUrl: "https://api.weixin.qq.com/sns/userinfo",
          scopes: ["snsapi_login"],
          pkce: false,
          tokenUrlParams: {
            grant_type: "authorization_code",
          },
          authorizationUrlParams: {
            response_type: "code",
            lang: "zh_CN",
          },
          getUserInfo: async (token) => {
            const openid = (token as OAuth2Tokens & { openid: string }).openid;

            if (!openid) {
              return null;
            }

            const params = new URLSearchParams({
              access_token: token.accessToken || "",
              openid: openid,
              lang: "zh_CN",
            });

            const { data: profile, error } = await betterFetch<WeChatProfile>(
              "https://api.weixin.qq.com/sns/userinfo?" + params.toString(),
              {
                method: "GET",
              }
            );

            if (error || !profile) {
              return null;
            }

            return {
              id: profile.unionid || profile.openid || openid,
              name: profile.nickname,
              email: profile.nickname,
              image: profile.headimgurl,
              emailVerified: true,
            };
          },
        },
      ],
    }),
  ],
  onAPIError: {
    errorURL: "/auth/error",
    onError: (error) => {
      console.error("auth error:", error);
    },
  },
  secret: env.BETTER_AUTH_SECRET,
});

export interface WeChatProfile extends Record<string, any> {
  openid: string;
  nickname: string;
  headimgurl: string;
  privilege: string[];
  unionid?: string;
  email?: string;
  error?: {
    errcode?: number;
    errmsg?: string;
  };
}
