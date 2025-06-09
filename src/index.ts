import express from 'express';
import { config } from './config';
import { webhookHandler } from './webhook';

const app = express();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/webhook', webhookHandler);

app.listen(config.port, () => {
  console.log(`🚀 Server listening on port ${config.port}`);
});
