import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import * as dotenv from 'dotenv';
import { GitHubService } from './services/github.service';
import { GithubPullRequestPayload } from './types/github.types';

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

webhooks.on('pull_request', async ({ payload }) => {
  try {
    await githubSrv.handlePullRequest(payload as GithubPullRequestPayload);
    console.log(
      `[PR Review] Successfully processed PR #${payload.pull_request.number} in ${payload.repository.full_name} (${payload.action})`,
    );
  } catch (error: any) {
    console.error(
      `[PR Review] Failed to process PR #${payload.pull_request.number} in ${payload.repository.full_name}:`,
      error.message,
    );
  }
});

webhooks.onError((event) => {
  console.error('[Webhook] Error processing webhook event:', event.errors);
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
  console.log('[Server] Ready to receive webhooks');
});
