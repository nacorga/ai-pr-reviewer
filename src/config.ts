import dotenv from 'dotenv';
dotenv.config();

const requiredEnvVars = {
  GITHUB_WEBHOOK_SECRET: 'GitHub Webhook Secret',
  GITHUB_TOKEN: 'GitHub Token',
  OPENAI_API_KEY: 'OpenAI API Key',
};

Object.entries(requiredEnvVars).forEach(([key, name]) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${name} (${key})`);
  }
});

export const config = {
  port: process.env.PORT || 3000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  github: {
    secret: process.env.GITHUB_WEBHOOK_SECRET,
    token: process.env.GITHUB_TOKEN,
  },
};