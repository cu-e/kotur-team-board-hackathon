import { Router } from 'express';
import { z } from 'zod';
import { BoardService } from '../services/BoardService';
import { authRequired } from '../middleware/auth';

export const BoardController = Router();
BoardController.use(authRequired);

BoardController.get('/me', async (req, res) => {
  const boards = await BoardService.myBoards(req.userId!);
  return res.json(boards);
});

BoardController.get('/:boardId', async (req, res) => {
  try {
    const b = await BoardService.get(req.params.boardId, req.userId!);
    return res.json(b);
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'BOARD_NOT_FOUND' });
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});

BoardController.get('/group/:groupId', async (req, res) => {
  try {
    const list = await BoardService.listByGroup(req.userId!, req.params.groupId);
    return res.json(list);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});

BoardController.post('/group/:groupId', async (req, res) => {
  const schema = z.object({ name: z.string().min(1), description: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    const created = await BoardService.create(
      req.params.groupId,
      req.userId!,
      parsed.data.name,
      parsed.data.description,
    );
    return res.status(201).json(created);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});
BoardController.delete('/:boardId', async (req, res) => {
  try {
    await BoardService.remove(req.params.boardId, req.userId!);
    return res.status(204).send();
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'BOARD_NOT_FOUND' });
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});
