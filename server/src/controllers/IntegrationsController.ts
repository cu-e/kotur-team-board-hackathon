import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth';
import { ensureBoardAccess } from '../middleware/access';
import { IntegrationService } from '../services/IntegrationService';

export const IntegrationsController = Router();
IntegrationsController.use(authRequired);

IntegrationsController.post('/diadoc/create-task', ensureBoardAccess, async (req, res) => {
  const schema = z.object({
    board_id: z.string().uuid(),
    document_title: z.string().min(1),
    document_url: z.string().url(),
    counterparty: z.string().optional(),
    due_at: z.string().optional(),
    assignee: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: 'BAD_INPUT', details: parsed.error.flatten() });
  const t = await IntegrationService.createTaskFromDiadoc(parsed.data);
  return res.status(201).json(t);
});

IntegrationsController.post('/tolk/import-transcript', ensureBoardAccess, async (req, res) => {
  const schema = z.object({
    board_id: z.string().uuid(),
    meeting_title: z.string().min(1),
    transcript: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: 'BAD_INPUT', details: parsed.error.flatten() });
  const r = await IntegrationService.importFromTolk(parsed.data);
  return res.json(r);
});
