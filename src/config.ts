import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  github: {
    secret: process.env.GITHUB_WEBHOOK_SECRET!,  
    token: process.env.GITHUB_TOKEN!,
  },
  openaiApiKey: process.env.OPENAI_API_KEY!,
};