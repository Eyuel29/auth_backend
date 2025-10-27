import { betterFetch } from '@better-fetch/fetch';
import type { BetterAuthPlugin } from 'better-auth';
import { generateState, parseState } from 'better-auth';
import { setSessionCookie } from 'better-auth/cookies';
import { createAuthEndpoint } from 'better-auth/api';
import { z } from 'zod';
import env from '@/env';

interface WeChatOAuthOptions {
  appId: string;
  appSecret: string;
  /** cn | en, default cn */
  lang?: 'cn' | 'en';
}

export function wechatOAuth(options: WeChatOAuthOptions): BetterAuthPlugin {
  const { appId, appSecret, lang = 'cn' } = options;

  const AUTH_URL = 'https://open.weixin.qq.com/connect/qrconnect';
  const TOKEN_URL = 'https://api.weixin.qq.com/sns/oauth2/access_token';
  const USERINFO_URL = 'https://api.weixin.qq.com/sns/userinfo';
  const DEBUG = env.WECHAT_DEBUG;

  const mask = (v?: string) => (v ? `${v.slice(0, 6)}...${v.slice(-4)}` : 'none');

  return {
    id: 'wechat-oauth',
    endpoints: {
      signInWeChat: createAuthEndpoint(
        '/sign-in/wechat',
        {
          method: 'POST',
          body: z.object({
            callbackURL: z.string().optional(),
            errorCallbackURL: z.string().optional(),
            newUserCallbackURL: z.string().optional(),
            disableRedirect: z.boolean().optional(),
          }) as any,
        },
        async (ctx) => {
          const { state } = await generateState(ctx);

          const redirectUri = `${ctx.context.baseURL}/oauth2/callback/wechat`;
          const url = new URL(AUTH_URL);
          url.searchParams.set('appid', appId);
          url.searchParams.set('redirect_uri', redirectUri);
          url.searchParams.set('response_type', 'code');
          url.searchParams.set('scope', 'snsapi_login');
          url.searchParams.set('state', state);
          url.searchParams.set('lang', lang);
          const finalUrl = `${url.toString()}#wechat_redirect`;

          if (DEBUG) {
            ctx.context.logger.debug('wechat.signInWeChat', {
              baseURL: ctx.context.baseURL,
              redirectUri,
              state,
              authUrl: finalUrl,
            });
          }

          return ctx.json({
            url: finalUrl,
            redirect: !ctx.body?.disableRedirect,
          });
        }
      ),

      wechatCallback: createAuthEndpoint(
        '/oauth2/callback/wechat',
        {
          method: 'GET',
          query: z.object({
            code: z.string().optional(),
            state: z.string().optional(),
            error: z.string().optional(),
          }) as any,
        },
        async (ctx) => {
          if (ctx.query.error || !ctx.query.code) {
            const err = ctx.query.error || 'wechat_code_missing';
            throw ctx.redirect(`${ctx.context.baseURL}/error?error=${err}`);
          }

          const { callbackURL, errorURL, newUserURL } = await parseState(ctx);

          if (DEBUG) {
            ctx.context.logger.debug('wechat.callback.query', {
              hasCode: !!ctx.query.code,
              codeLen: ctx.query.code?.length,
              state: ctx.query.state,
              callbackURL,
              errorURL,
              newUserURL,
            });
          }

          const tokenUrl = new URL(TOKEN_URL);
          tokenUrl.searchParams.set('appid', appId);
          tokenUrl.searchParams.set('secret', appSecret);
          tokenUrl.searchParams.set('code', ctx.query.code);
          tokenUrl.searchParams.set('grant_type', 'authorization_code');

          const tokenResp = await betterFetch(tokenUrl.toString(), { method: 'GET' });
          const tokenData: any = tokenResp.data;

          if (!tokenData || tokenData.errcode) {
            const err = tokenData?.errmsg || 'wechat_token_error';
            if (DEBUG) {
              ctx.context.logger.error('wechat.callback.token_error', {
                errcode: tokenData?.errcode,
                errmsg: tokenData?.errmsg,
              });
            }
            throw ctx.redirect(
              `${errorURL || callbackURL || ctx.context.baseURL}/error?error=${encodeURIComponent(err)}`
            );
          }

          const accessToken: string | undefined = tokenData.access_token;
          const refreshToken: string | undefined = tokenData.refresh_token;
          const openid: string | undefined = tokenData.openid;
          const scope: string | undefined = tokenData.scope;
          const expiresIn: number | undefined = tokenData.expires_in;

          if (!accessToken || !openid) {
            if (DEBUG) {
              ctx.context.logger.error('wechat.callback.missing_fields', {
                hasAccessToken: !!accessToken,
                hasOpenId: !!openid,
              });
            }
            throw ctx.redirect(
              `${errorURL || callbackURL || ctx.context.baseURL}/error?error=wechat_token_missing_fields`
            );
          }

          const userInfoUrl = new URL(USERINFO_URL);
          userInfoUrl.searchParams.set('access_token', accessToken);
          userInfoUrl.searchParams.set('openid', openid);
          userInfoUrl.searchParams.set('lang', lang === 'cn' ? 'zh_CN' : 'en');

          const userResp = await betterFetch(userInfoUrl.toString(), { method: 'GET' });
          const profile: any = userResp.data;

          if (!profile || profile.errcode) {
            const err = profile?.errmsg || 'wechat_userinfo_error';
            if (DEBUG) {
              ctx.context.logger.error('wechat.callback.userinfo_error', {
                errcode: profile?.errcode,
                errmsg: profile?.errmsg,
              });
            }
            throw ctx.redirect(
              `${errorURL || callbackURL || ctx.context.baseURL}/error?error=${encodeURIComponent(err)}`
            );
          }

          const id = profile.unionid || profile.openid || openid;
          const syntheticEmailDomain = env.WECHAT_SYNTHETIC_EMAIL_DOMAIN || 'wechat.local';
          const email = `${id}@${syntheticEmailDomain}`.toLowerCase();

          if (DEBUG) {
            ctx.context.logger.debug('wechat.callback.profile', {
              idMasked: mask(id),
              hasUnionId: !!profile.unionid,
              hasOpenId: !!profile.openid,
              nicknameLen: profile.nickname?.length,
              scope,
              accessTokenMasked: mask(accessToken),
              refreshTokenMasked: mask(refreshToken),
              expiresIn,
            });
          }

          const lowerEmail = email.toLowerCase();
          const dbUser = await ctx.context.internalAdapter
            .findOAuthUser(lowerEmail, id, 'wechat')
            .catch(() => null);

          let user = dbUser?.user;
          let isRegister = !user;

          if (dbUser) {
            const existing = dbUser.accounts.find((a: any) => a.providerId === 'wechat');
            if (!existing) {
              try {
                await ctx.context.internalAdapter.linkAccount({
                  providerId: 'wechat',
                  accountId: id.toString(),
                  userId: dbUser.user.id,
                  accessToken,
                  refreshToken,
                  accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
                  scope,
                });
              } catch (e) {
                if (DEBUG) {
                  ctx.context.logger.error('wechat.callback.link_account_failed', e as any);
                }
                throw ctx.redirect(`${errorURL || callbackURL || ctx.context.baseURL}/error?error=unable_to_link_account`);
              }
            } else {
              const updateData = Object.fromEntries(
                Object.entries({
                  accessToken,
                  refreshToken,
                  accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
                  scope,
                }).filter(([_, v]) => v !== undefined)
              );
              if (Object.keys(updateData).length > 0) {
                await ctx.context.internalAdapter.updateAccount(existing.id, updateData as any);
              }
            }
          } else {
            const created = await ctx.context.internalAdapter
              .createOAuthUser(
                {
                  email: lowerEmail,
                  emailVerified: true,
                  name: profile.nickname,
                  image: profile.headimgurl,
                },
                {
                  providerId: 'wechat',
                  accountId: id.toString(),
                  accessToken,
                  refreshToken,
                  accessTokenExpiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined,
                  scope,
                }
              )
              .then((res: any) => res?.user)
              .catch((e: any) => {
                if (DEBUG) {
                  ctx.context.logger.error('wechat.callback.create_oauth_user_failed', e);
                }
                return null;
              });

            if (!created) {
              throw ctx.redirect(`${errorURL || callbackURL || ctx.context.baseURL}/error?error=unable_to_create_user`);
            }
            user = created;
            isRegister = true;
          }

          if (!user) {
            throw ctx.redirect(`${errorURL || callbackURL || ctx.context.baseURL}/error?error=user_not_found`);
          }

          const session = await ctx.context.internalAdapter.createSession(user.id, ctx);
          if (!session) {
            throw ctx.redirect(`${errorURL || callbackURL || ctx.context.baseURL}/error?error=unable_to_create_session`);
          }

          await setSessionCookie(ctx, { session, user });
          const redirectTo = isRegister ? newUserURL || callbackURL : callbackURL;
          if (DEBUG) {
            ctx.context.logger.debug('wechat.callback.success', {
              userIdMasked: mask(user.id),
              redirectTo,
              isRegister,
            });
          }
          throw ctx.redirect(redirectTo);
        }
      ),
    },
  };
}
