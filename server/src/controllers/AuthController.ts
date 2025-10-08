import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/AuthService';

export const AuthController = Router();

AuthController.post('/login', async (req, res) => {
  const schema = z.object({ username: z.string().min(1), password: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: 'BAD_INPUT', details: parsed.error.flatten() });
  const { username, password } = parsed.data;
  const { token, user } = await AuthService.login(username, password);
  return res.json({ token, user });
});
