import express from 'express';
import { config } from './config';
import { webhookHandler } from './webhook';

const app = express();

app.use(express.json());

app.use((req, _res, next) => {
  console.log(`${req.method}: ${req.path}`);

  next();
});

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(webhookHandler);

app.use((err: Error, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(config.port, () => {
  console.log(`🚀 Server listening on port ${config.port}`);
});
