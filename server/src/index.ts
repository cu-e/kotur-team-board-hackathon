import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const PORT = Number(process.env.SERVER_PORT) || 8000;
app.listen(PORT, () => {
  console.log(`Слушаю http://localhost:${PORT}`);
});
