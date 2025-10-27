/* eslint-disable node/no-process-env */
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'node:path';
import { z } from 'zod';

const envPath = process.env.ENVIRONMENT === 'test' ? '.env.test' : '.env';

expand(
  config({
    path: resolve(process.cwd(), envPath),
    quiet: true,
  }),
);

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    ALLOWED_ORIGIN: z.string(),
    GOOGLE_OAUTH_CLIENT_ID: z.string(),
    GOOGLE_OAUTH_CLIENT_SECRET: z.string(),
    WECHAT_OAUTH_CLIENT_ID: z.string(),
    WECHAT_OAUTH_CLIENT_SECRET: z.string(),
    WECHAT_SYNTHETIC_EMAIL_DOMAIN: z.string().default('wechat.local'),
    WECHAT_DEBUG: z.coerce.boolean().default(false),
    BETTER_AUTH_SECRET: z.string().optional(),
  });

export type Env = z.infer<typeof envSchema>;

const { data: env, error } = envSchema.safeParse(process.env);

if (error) {
  console.error('Invalid env:');
  console.error(JSON.stringify(z.treeifyError(error), null, 2));
  process.exit(1);
}

export default env!;
