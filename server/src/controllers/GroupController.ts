import { Router } from 'express';
import { z } from 'zod';
import { GroupService } from '../services/GroupService';
import { authRequired } from '../middleware/auth';
import { TagService } from '../services/TagService';
import { GroupRole } from '../entities/enums';
import { RoleService } from '../services/RoleService';
import { GroupMember } from '../entities/GroupMember';
import { AppDataSource } from '../datasource';
import { SearchIndex } from '../services/search/SearchIndex';

export const GroupController = Router();

GroupController.use(authRequired);

GroupController.post('/', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    joinCode: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  const g = await GroupService.create(
    req.userId!,
    parsed.data.name,
    parsed.data.description,
    parsed.data.joinCode,
  );
  return res.status(201).json(g);
});

GroupController.get('/me', async (req, res) => {
  const groups = await GroupService.myGroups(req.userId!);
  return res.json(groups);
});

GroupController.post('/join', async (req, res) => {
  const schema = z.object({ joinCode: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    const g = await GroupService.join(req.userId!, parsed.data.joinCode);
    return res.json(g);
  } catch (e: any) {
    if (e.message === 'GROUP_NOT_FOUND') return res.status(404).json({ error: 'GROUP_NOT_FOUND' });
    throw e;
  }
});

// список участников группы
GroupController.get('/:groupId/members', async (req, res) => {
  try {
    const list = await GroupService.members(req.userId!, req.params.groupId);
    return res.json(list);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});

// теги группы
GroupController.get('/:groupId/tags', async (req, res) => {
  try {
    const tags = await TagService.list(req.params.groupId, req.userId!);
    return res.json(tags);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});
GroupController.delete('/:groupId/tags/:tagId', async (req, res) => {
  try {
    await TagService.remove(req.params.groupId, req.userId!, req.params.tagId);
    return res.status(204).send();
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'TAG_NOT_FOUND' });
    throw e;
  }
});

// роли: list create update delete
GroupController.get('/:groupId/roles', async (req, res) => {
  try {
    const roles = await RoleService.list(req.params.groupId, req.userId!);
    return res.json(roles);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});
GroupController.post('/:groupId/roles', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1),
    manageTags: z.boolean().optional(),
    manageMembers: z.boolean().optional(),
    assignRoles: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    const role = await RoleService.create(req.params.groupId, req.userId!, parsed.data);
    return res.status(201).json(role);
  } catch (e: any) {
    if ((e as any).code === 'ROLE_EXISTS') return res.status(409).json({ error: 'ROLE_EXISTS' });
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});
GroupController.patch('/:groupId/roles/:roleId', async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).optional(),
    manageTags: z.boolean().optional(),
    manageMembers: z.boolean().optional(),
    assignRoles: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    const role = await RoleService.update(
      req.params.groupId,
      req.userId!,
      req.params.roleId,
      parsed.data as any,
    );
    return res.json(role);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'ROLE_NOT_FOUND' });
    throw e;
  }
});
GroupController.delete('/:groupId/roles/:roleId', async (req, res) => {
  try {
    await RoleService.remove(req.params.groupId, req.userId!, req.params.roleId);
    return res.status(204).send();
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'ROLE_NOT_FOUND' });
    throw e;
  }
});

// выдать/забрать роль
GroupController.post('/:groupId/members/:userId/roles/:roleId', async (req, res) => {
  try {
    await RoleService.assignRole(
      req.params.groupId,
      req.userId!,
      req.params.userId,
      req.params.roleId,
    );
    return res.status(204).send();
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});
GroupController.delete('/:groupId/members/:userId/roles/:roleId', async (req, res) => {
  try {
    await RoleService.revokeRole(
      req.params.groupId,
      req.userId!,
      req.params.userId,
      req.params.roleId,
    );
    return res.status(204).send();
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});

// Быстрый поиск
GroupController.get('/:groupId/search', async (req, res) => {
  const schema = z.object({
    type: z.enum(['member', 'tag']),
    q: z.string().min(1),
    limit: z.string().optional(),
  });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  // Доступ только для членов
  const gm = await AppDataSource.getRepository(GroupMember).findOne({
    where: { group: { id: req.params.groupId }, user: { id: req.userId! } },
  });
  if (!gm) return res.status(403).json({ error: 'FORBIDDEN' });
  const ids = SearchIndex.search(
    req.params.groupId,
    parsed.data.type as 'member' | 'tag',
    parsed.data.q,
    parsed.data.limit ? parseInt(parsed.data.limit, 10) : 10,
  );
  return res.json({ ids });
});

// ручная переиндексация группы
GroupController.post('/:groupId/search/reindex', async (req, res) => {
  // только админам и владельцу
  const gm = await AppDataSource.getRepository(GroupMember).findOne({
    where: { group: { id: req.params.groupId }, user: { id: req.userId! } },
  });
  if (!gm) return res.status(403).json({ error: 'FORBIDDEN' });
  // собрать участников и теги
  const members = await AppDataSource.getRepository(GroupMember).find({
    where: { group: { id: req.params.groupId } },
    relations: ['user'],
  });
  SearchIndex.reindexMembers(
    req.params.groupId,
    members.map((m) => ({ id: m.user.id, name: m.user.displayName || m.user.username })),
  );
  const tags = await AppDataSource.getRepository('group_tags' as any).find({
    where: { group: { id: req.params.groupId } },
  });
  SearchIndex.reindexTags(
    req.params.groupId,
    tags.map((t: any) => ({ id: t.id, name: t.name })),
  );
  return res.json({ ok: true });
});

GroupController.post('/:groupId/tags', async (req, res) => {
  const schema = z.object({ name: z.string().min(1), color: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    const tag = await TagService.create(
      req.params.groupId,
      req.userId!,
      parsed.data.name,
      parsed.data.color,
    );
    return res.status(201).json(tag);
  } catch (e: any) {
    if ((e as any).code === 'TAG_EXISTS') return res.status(409).json({ error: 'TAG_EXISTS' });
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});

GroupController.get('/:groupId/members', async (req, res) => {
  try {
    const list = await GroupService.members(req.userId!, req.params.groupId);
    return res.json(list);
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    throw e;
  }
});

// Назначить базовую роль
GroupController.patch('/:groupId/members/:userId/role', async (req, res) => {
  const schema = z.object({ role: z.nativeEnum(GroupRole) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'BAD_INPUT' });
  try {
    if (![GroupRole.ADMIN, GroupRole.MEMBER].includes(parsed.data.role))
      return res.status(400).json({ error: 'ROLE_NOT_ALLOWED' });
    await GroupService.changeBaseRole(
      req.userId!,
      req.params.groupId,
      req.params.userId,
      parsed.data.role,
    );
    return res.status(204).send();
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });
    if (e.message === 'CANNOT_CHANGE_OWNER')
      return res.status(400).json({ error: 'CANNOT_CHANGE_OWNER' });
    throw e;
  }
});

// Удалить участника (токо owner)
GroupController.delete('/:groupId/members/:userId', async (req, res) => {
  try {
    await GroupService.removeMember(req.userId!, req.params.groupId, req.params.userId);
    return res.status(204).send();
  } catch (e: any) {
    if (e.message === 'FORBIDDEN') return res.status(403).json({ error: 'FORBIDDEN' });
    if (e.message === 'NOT_FOUND') return res.status(404).json({ error: 'MEMBER_NOT_FOUND' });
    if (e.message === 'CANNOT_REMOVE_OWNER')
      return res.status(400).json({ error: 'CANNOT_REMOVE_OWNER' });
    throw e;
  }
});
