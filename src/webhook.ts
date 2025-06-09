import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { config } from './config';
import { GitHubService } from './services/github.service';

const webhooks = new Webhooks({ secret: config.github.secret as string });
const githubService = new GitHubService();

webhooks.on('pull_request', async ({ id, name, payload }) => {
  console.log(`Received event ${name} (${id})`);
  await githubService.handlePullRequest(payload as any);
});

export const webhookHandler = createNodeMiddleware(webhooks, { path: '/' });