import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import { AppDataSource } from './datasource';
import { routes } from './routes';
import { WebhookController } from './controllers/WebhookController';
import cors from 'cors';

dotenv.config();

const PORT = Number(process.env.SERVER_PORT || 8000);
const DB_HOST = process.env.DB_HOST || 8000;

console.log('[ENV CHECK]', {
  DB_USER: process.env.POSTGRES_USER,
  DB_NAME: process.env.POSTGRES_DB,
  DB_PASS: process.env.POSTGRES_PASSWORD,
  DB_PASS_LEN: process.env.POSTGRES_PASSWORD?.length,
  DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'unset',
  port: PORT,
});
async function bootstrap() {
  AppDataSource.initialize();
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/hooks', WebhookController);
  app.use('/api', routes);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    res.status(500).json({ error: 'INTERNAL', details: String(err?.message || err) });
  });

  app.listen(PORT, () => console.log(`API running на http://localhost:${PORT}`));

  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
  });
}

bootstrap().catch((e) => {
  console.error('Ошибочка запуска', e);
  process.exit(1);
});
