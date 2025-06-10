import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { config } from './config';
import { GitHubService } from './services/github.service';

const webhooks = new Webhooks({ secret: config.github.secret as string });
const githubService = new GitHubService();

webhooks.on('pull_request', async ({ id, name, payload }) => {
  console.log(`Received event ${name} (${id})`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    await githubService.handlePullRequest(payload as any);
    console.log('Successfully processed webhook');
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

webhooks.onError((error) => {
  console.error('Webhook error:', error);
});

export const webhookHandler = createNodeMiddleware(webhooks, { path: '/webhook' });
