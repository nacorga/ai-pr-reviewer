import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import * as dotenv from 'dotenv';
import { GitHubService } from './services/github.service';

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

const webhooks = new Webhooks({ secret: process.env.GITHUB_WEBHOOK_SECRET as string });

const githubSrv = new GitHubService();

webhooks.on('pull_request.opened', async ({ id, name, payload }) => {
  try {
    await githubSrv.handlePullRequest(payload as any);
    console.log(`✅ Pull request ${payload.pull_request.number} handled`);
  } catch (error: any) {
    console.error(`❌ Error handling pull request:`, error.message);
  }
});

webhooks.onError((event) => {
  console.error(`❌ Error handling webhook:`, event.errors);
});

const middleware = createNodeMiddleware(webhooks, { path: '/webhooks' });

const port = Number(process.env.PORT) || 3000;

createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (await middleware(req, res)) {
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}).listen(port, () => {
  console.log(`🚀 Server listening on http://localhost:${port}/webhooks`);
});
