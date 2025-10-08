import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth';
import { ensureBoardAccess } from '../middleware/access';
import { TaskService } from '../services/TaskService';
import { TaskSource } from '../entities/enums';

export const TemplatesController = Router();
TemplatesController.use(authRequired);

TemplatesController.post('/compliance/enable', ensureBoardAccess, async (req, res) => {
  const schema = z.object({ board_id: z.string().uuid(), template: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  const { board_id, template } = parsed.data;
  // простая демо-заготовка: создадим пару задач
  const tasks = [] as any[];
  if (template === 'nds_quarterly') {
    tasks.push(
      await TaskService.create(board_id, {
        title: 'Подготовить декларацию НДС (квартал)',
        source: TaskSource.EXTERN,
      } as any),
    );
    tasks.push(
      await TaskService.create(board_id, {
        title: 'Проверить расхождения НДС+',
        source: TaskSource.EXTERN,
      } as any),
    );
  } else {
    tasks.push(
      await TaskService.create(board_id, {
        title: `Активировать шаблон: ${template}`,
        source: TaskSource.MANUAL,
      } as any),
    );
  }
  return res.json({ created: tasks });
});
