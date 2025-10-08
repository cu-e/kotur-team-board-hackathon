import { Router } from 'express';
import { z } from 'zod';
import { TaskService } from '../services/TaskService';
import { authRequired } from '../middleware/auth';
import { ensureBoardAccess } from '../middleware/access';
import { TaskStatus, TaskSource } from '../entities/enums';

export const TaskController = Router();
TaskController.use(authRequired);

TaskController.get('/board/:boardId', ensureBoardAccess, async (req, res) => {
  const schema = z.object({
    status: z.nativeEnum(TaskStatus).optional(),
    dueBefore: z.string().optional(),
    label: z.string().optional(),
    source: z.nativeEnum(TaskSource).optional(),
  });
  const parsed = schema.safeParse(req.query);
  const tasks = await TaskService.list(
    req.params.boardId,
    parsed.success ? (parsed.data as any) : undefined,
  );
  return res.json(tasks);
});

TaskController.post('/board/:boardId', ensureBoardAccess, async (req, res) => {
  const schema = z.object({
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    assignee: z.string().nullable().optional(),
    assignee_user_id: z.string().uuid().nullable().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    due_at: z.string().nullable().optional(),
    labels: z.array(z.string()).optional(),
    source: z.nativeEnum(TaskSource).optional(),
    source_link: z.string().url().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: 'BAD_INPUT', details: parsed.error.flatten() });
  try {
    const t = await TaskService.create(req.params.boardId, parsed.data as any);
    return res.status(201).json(t);
  } catch (e: any) {
    if (e.message === 'ASSIGNEE_NOT_MEMBER')
      return res.status(400).json({ error: 'ASSIGNEE_NOT_MEMBER' });
    if (e.message === 'UNKNOWN_TAGS')
      return res.status(400).json({ error: 'UNKNOWN_TAGS', tags: (e as any).tags });
    throw e;
  }
});

TaskController.patch('/:taskId', authRequired, async (req, res) => {
  const schema = z.object({
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    assignee: z.string().nullable().optional(),
    assignee_user_id: z.string().uuid().nullable().optional(),
    status: z.nativeEnum(TaskStatus).optional(),
    due_at: z.string().nullable().optional(),
    labels: z.array(z.string()).nullable().optional(),
    source_link: z.string().url().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    const t = await TaskService.update(req.params.taskId, parsed.data as any);
    return res.json(t);
  } catch (e: any) {
    if (e.message === 'ASSIGNEE_NOT_MEMBER')
      return res.status(400).json({ error: 'ASSIGNEE_NOT_MEMBER' });
    if (e.message === 'UNKNOWN_TAGS')
      return res.status(400).json({ error: 'UNKNOWN_TAGS', tags: (e as any).tags });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'TASK_NOT_FOUND' });
    throw e;
  }
});

TaskController.delete('/:taskId', authRequired, async (req, res) => {
  await TaskService.remove(req.params.taskId);
  return res.status(204).send();
});
