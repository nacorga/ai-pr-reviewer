import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { config } from './config';
import { GitHubService } from './services/github.service';

if (!config.github.secret) {
  throw new Error('GitHub webhook secret is not configured');
}

// Configuración de logging común
const logConfig = {
  debug: (...args: any[]) => console.log('[DEBUG]', ...args),
  info: (...args: any[]) => console.log('[INFO]', ...args),
  warn: (...args: any[]) => console.warn('[WARN]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args),
};

const webhooks = new Webhooks({ 
  secret: config.github.secret,
  log: {
    debug: (...args: any[]) => logConfig.debug('Webhook:', ...args),
    info: (...args: any[]) => logConfig.info('Webhook:', ...args),
    warn: (...args: any[]) => logConfig.warn('Webhook:', ...args),
    error: (...args: any[]) => logConfig.error('Webhook:', ...args),
  }
});

const githubService = new GitHubService();

// Manejador para todos los eventos
webhooks.onAny(({ id, name, payload }) => {
  logConfig.info(`Received ${name} event (${id})`);
  logConfig.debug('Payload:', JSON.stringify(payload, null, 2));
});

// Manejador específico para pull requests
webhooks.on('pull_request', async ({ id, name, payload }) => {
  logConfig.info(`Processing pull request event (${id})`);
  logConfig.debug('PR Details:', {
    action: payload.action,
    number: payload.pull_request.number,
    title: payload.pull_request.title,
    repository: payload.repository.full_name,
    branch: `${payload.pull_request.head.ref} -> ${payload.pull_request.base.ref}`
  });
  
  try {
    await githubService.handlePullRequest(payload as any);
    logConfig.info(`Successfully processed pull request webhook (${id})`);
  } catch (error) {
    logConfig.error(`Error processing pull request webhook (${id}):`, error);
    throw error;
  }
});

// Manejador para el evento ping (verificación de webhook)
webhooks.on('ping', ({ id, name }) => {
  logConfig.info(`Received ping event (${id})`);
  logConfig.info('Webhook is properly configured!');
});

// Manejador de errores global
webhooks.onError((error) => {
  logConfig.error('Webhook error:', error);
});

// Middleware para Express
export const webhookHandler = createNodeMiddleware(webhooks, { 
  path: '/webhook',
  log: {
    debug: (...args: any[]) => logConfig.debug('Middleware:', ...args),
    info: (...args: any[]) => logConfig.info('Middleware:', ...args),
    warn: (...args: any[]) => logConfig.warn('Middleware:', ...args),
    error: (...args: any[]) => logConfig.error('Middleware:', ...args),
  }
});
