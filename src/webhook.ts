import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import { config } from './config';
import { GitHubService } from './services/github.service';

if (!config.github.secret) {
  throw new Error('GitHub webhook secret is not configured');
}

const webhooks = new Webhooks({ 
  secret: config.github.secret,
  log: {
    debug: (...args) => console.debug('[Webhook Debug]', ...args),
    info: (...args) => console.info('[Webhook Info]', ...args),
    warn: (...args) => console.warn('[Webhook Warning]', ...args),
    error: (...args) => console.error('[Webhook Error]', ...args),
  }
});

const githubService = new GitHubService();

// Manejador para todos los eventos
webhooks.onAny(({ id, name, payload }) => {
  console.log(`[${new Date().toISOString()}] Received ${name} event (${id})`);
});

// Manejador específico para pull requests
webhooks.on('pull_request', async ({ id, name, payload }) => {
  console.log(`[${new Date().toISOString()}] Processing pull request event (${id})`);
  
  try {
    await githubService.handlePullRequest(payload as any);
    console.log(`[${new Date().toISOString()}] Successfully processed pull request webhook`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing pull request webhook:`, error);
    throw error; // Re-lanzar para que el manejador de errores lo capture
  }
});

// Manejador para el evento ping (verificación de webhook)
webhooks.on('ping', ({ id, name }) => {
  console.log(`[${new Date().toISOString()}] Received ping event (${id})`);
  console.log('Webhook is properly configured!');
});

// Manejador de errores global
webhooks.onError((error) => {
  console.error(`[${new Date().toISOString()}] Webhook error:`, error);
  // Aquí podrías agregar integración con servicios de monitoreo como Sentry
});

// Middleware para Express
export const webhookHandler = createNodeMiddleware(webhooks, { 
  path: '/webhook',
  log: {
    debug: (...args) => console.debug('[Middleware Debug]', ...args),
    info: (...args) => console.info('[Middleware Info]', ...args),
    warn: (...args) => console.warn('[Middleware Warning]', ...args),
    error: (...args) => console.error('[Middleware Error]', ...args),
  }
});
