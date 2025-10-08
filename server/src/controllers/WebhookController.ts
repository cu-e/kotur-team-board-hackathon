import { Router } from 'express';
import { z } from 'zod';
import { IntegrationRegistryService } from '../services/IntegrationRegistryService';
import { TaskService } from '../services/TaskService';
import { TaskSource } from '../entities/enums';

export const WebhookController = Router();

const payloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  assignee_user_id: z.string().uuid().nullable().optional(),
  assignee: z.string().nullable().optional(),
  status: z
    .nativeEnum(TaskSource)
    .optional()
    .transform(() => undefined) // игнорируем, статус задаёт система/по умолчанию
    .or(z.any().optional()),
  due_at: z.string().nullable().optional(),
  labels: z.array(z.string()).optional(),
  source_link: z.string().url().optional(),
});

function extractDomain(req: any): string | null {
  const hdr =
    (req.headers['x-webhook-domain'] as string) ||
    (req.headers['origin'] as string) ||
    (req.headers['referer'] as string) ||
    '';
  if (!hdr) return null;
  try {
    const u = new URL(hdr.includes('://') ? hdr : `https://${hdr}`);
    return u.hostname;
  } catch {
    return hdr.replace(/^https?:\/\//, '');
  }
}

WebhookController.post('/:key', async (req, res) => {
  const integ = await IntegrationRegistryService.byKey(req.params.key);
  if (!integ || !integ.active) return res.status(404).json({ error: 'NOT_FOUND' });
  if (!integ.targetBoard) return res.status(400).json({ error: 'NO_TARGET_BOARD' });

  // Проверка доверенного домена (если задан)
  const dom = extractDomain(req);
  if (integ.trustedDomain && dom && dom !== integ.trustedDomain) {
    return res.status(403).json({ error: 'UNTRUSTED_DOMAIN', got: dom });
  }

  const parsed = payloadSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: 'BAD_INPUT', details: parsed.error.flatten() });

  // Определяем источник
  let source: TaskSource = TaskSource.WEBHOOK;
  if (integ.isBuiltin) {
    if (integ.builtinType === 'diadoc') source = TaskSource.DIADOC;
    else if (integ.builtinType === 'extern') source = TaskSource.EXTERN;
    else if (integ.builtinType === 'tolk') source = TaskSource.TOLK;
  }

  // Создаём задачу. Цвет/имя источника присваиваем из интеграции
  try {
    const t = await TaskService.create(integ.targetBoard.id, {
      ...parsed.data,
      source,
      // origin поля
      origin_integration_id: integ.id,
      origin_name: integ.name,
      origin_color: integ.color || null,
    } as any);
    return res.status(201).json(t);
  } catch (e: any) {
    if (e.message === 'ASSIGNEE_NOT_MEMBER')
      return res.status(400).json({ error: 'ASSIGNEE_NOT_MEMBER' });
    if (e.message === 'UNKNOWN_TAGS')
      return res.status(400).json({ error: 'UNKNOWN_TAGS', tags: (e as any).tags });
    return res.status(500).json({ error: 'INTERNAL', details: String(e?.message || e) });
  }
});
