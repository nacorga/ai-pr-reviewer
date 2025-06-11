import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import * as dotenv from 'dotenv';
import { GitHubService } from './services/github.service';
import { BitbucketService } from './services/bitbucket.service';
import { GithubPullRequestPayload } from './types/github.types';
import { BitbucketPullRequestPayload } from './types/bitbucket.types';
import crypto from 'crypto';

dotenv.config();

const requiredEnvVars = {
  OPENAI_API_KEY: 'OpenAI API Key',
};

Object.entries(requiredEnvVars).forEach(([key, name]) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${name} (${key})`);
  }
});

const githubWebhooks = new Webhooks({ secret: process.env.WEBHOOK_SECRET as string });
const githubSrv = new GitHubService();

githubWebhooks.on('pull_request', async ({ payload }) => {
  try {
    await githubSrv.handlePullRequest(payload as GithubPullRequestPayload);
    console.log(
      `[PR Review] Successfully processed GitHub PR #${payload.pull_request.number} in ${payload.repository.full_name} (${payload.action})`,
    );
  } catch (error: any) {
    console.error(
      `[PR Review] Failed to process GitHub PR #${payload.pull_request.number} in ${payload.repository.full_name}:`,
      error.message,
    );
  }
});

githubWebhooks.onError((event) => {
  console.error('[GitHub Webhook] Error processing webhook event:', event.errors);
});

const githubMiddleware = createNodeMiddleware(githubWebhooks, { path: '/webhooks/github' });

const bitbucketSrv = new BitbucketService();

async function verifyBitbucketWebhook(req: IncomingMessage): Promise<boolean> {
  const signature = req.headers['x-hub-signature-256'];
  const body = await new Promise<string>((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
  });

  if (!signature || !process.env.WEBHOOK_SECRET) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
  const digest = hmac.update(body).digest('hex');

  return `sha256=${digest}` === signature;
}

async function handleBitbucketWebhook(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method Not Allowed');
    return;
  }

  const isValid = await verifyBitbucketWebhook(req);
  if (!isValid) {
    res.writeHead(401);
    res.end('Invalid signature');
    return;
  }

  const body = await new Promise<string>((resolve) => {
    let data = '';

    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      resolve(data);
    });
  });

  try {
    const payload = JSON.parse(body) as BitbucketPullRequestPayload;

    await bitbucketSrv.handlePullRequest(payload);

    res.writeHead(200);
    res.end('OK');
  } catch (error: any) {
    console.error('[Bitbucket Webhook] Error processing webhook:', error);
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}

const port = Number(process.env.PORT) || 3000;

createServer(async (req: IncomingMessage, res: ServerResponse) => {
  if (req.url?.startsWith('/webhooks/github')) {
    if (await githubMiddleware(req, res)) {
      return;
    }
  } else if (req.url?.startsWith('/webhooks/bitbucket')) {
    await handleBitbucketWebhook(req, res);

    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}).listen(port, () => {
  console.log('[Server] Ready to receive webhooks');
});
