import { Router } from 'express';
import { z } from 'zod';
import { authRequired } from '../middleware/auth';
import { IntegrationRegistryService } from '../services/IntegrationRegistryService';

export const IntegrationController = Router();
IntegrationController.use(authRequired);

// list
IntegrationController.get('/groups/:groupId/integrations', async (req, res) => {
  try {
    const list = await IntegrationRegistryService.list(req.params.groupId, req.userId!);
    return res.json(list);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});

// create
IntegrationController.post('/groups/:groupId/integrations', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
    trustedDomain: z.string().optional(),
    board_id: z.string().uuid().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    const integ = await IntegrationRegistryService.create(
      req.params.groupId,
      req.userId!,
      parsed.data,
    );
    return res.status(201).json(integ);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (String(e.message).includes('uq_integration_name_in_group'))
      return res.status(409).json({ error: 'NAME_EXISTS' });
    throw e;
  }
});

// update
IntegrationController.patch('/groups/:groupId/integrations/:id', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    color: z.string().nullable().optional(),
    trustedDomain: z.string().nullable().optional(),
    board_id: z.string().uuid().nullable().optional(),
    active: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    const integ = await IntegrationRegistryService.update(
      req.params.groupId,
      req.userId!,
      req.params.id,
      parsed.data as any,
    );
    return res.json(integ);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'NOT_FOUND' });
    throw e;
  }
});

// delete
IntegrationController.delete('/groups/:groupId/integrations/:id', async (req, res) => {
  try {
    await IntegrationRegistryService.remove(req.params.groupId, req.userId!, req.params.id);
    return res.status(204).send();
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'NOT_FOUND' });
    if (e.message === 'CANNOT_DELETE_BUILTIN')
      return res.status(400).json({ error: 'CANNOT_DELETE_BUILTIN' });
    throw e;
  }
});

// rotate key
IntegrationController.post('/groups/:groupId/integrations/:id/rotate-key', async (req, res) => {
  try {
    const integ = await IntegrationRegistryService.rotateKey(
      req.params.groupId,
      req.userId!,
      req.params.id,
    );
    return res.json({ id: integ.id, key: integ.key });
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'NOT_FOUND' });
    throw e;
  }
});
