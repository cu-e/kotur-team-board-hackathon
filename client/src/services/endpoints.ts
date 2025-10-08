import { api } from './api';
import type {
  Board,
  Group,
  Task,
  UUID,
  User,
  GroupMember,
  RoleDef,
  GroupTag,
  Integration,
  IntegrationCreate,
  IntegrationPatch,
} from '../types/domain';
import { TaskSource, TaskStatus } from '../types/domain';

/** ===== Auth ===== */

export const AuthAPI = {
  login: (payload: { username: string; password: string }) =>
    api<{ token: string; user: User }>(`/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

/** ===== Groups ===== */

export const GroupsAPI = {
  myGroups: () => api<Group[]>(`/groups/me`),

  create: (payload: { name: string; description?: string; joinCode?: string }) =>
    api<Group>(`/groups`, { method: 'POST', body: JSON.stringify(payload) }),

  join: (joinCode: string) =>
    api<Group>(`/groups/join`, { method: 'POST', body: JSON.stringify({ joinCode }) }),

  boards: (groupId: UUID) => api<Board[]>(`/boards/group/${groupId}`),

  /** --- Участники --- */
  members: (groupId: UUID) => api<GroupMember[]>(`/groups/${groupId}/members`),
  /** Только owner: повысить/понизить базовую роль */
  setMemberBaseRole: (groupId: UUID, userId: UUID, role: 'admin' | 'member') =>
    api<void>(`/groups/${groupId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  /** Только owner: удалить участника */
  removeMember: (groupId: UUID, userId: UUID) =>
    api<void>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' }),

  /** --- Кастомные роли --- */
  getRoles: (groupId: UUID) => api<RoleDef[]>(`/groups/${groupId}/roles`),
  createRole: (
    groupId: UUID,
    payload: { name: string; manageTags?: boolean; manageMembers?: boolean; assignRoles?: boolean },
  ) => api<RoleDef>(`/groups/${groupId}/roles`, { method: 'POST', body: JSON.stringify(payload) }),
  updateRole: (
    groupId: UUID,
    roleId: UUID,
    patch: Partial<{
      name: string;
      manageTags: boolean;
      manageMembers: boolean;
      assignRoles: boolean;
    }>,
  ) =>
    api<RoleDef>(`/groups/${groupId}/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteRole: (groupId: UUID, roleId: UUID) =>
    api<void>(`/groups/${groupId}/roles/${roleId}`, { method: 'DELETE' }),

  /** Выдать / забрать кастомную роль у участника */
  grantRole: (groupId: UUID, userId: UUID, roleId: UUID) =>
    api<void>(`/groups/${groupId}/members/${userId}/roles/${roleId}`, { method: 'POST' }),
  revokeRole: (groupId: UUID, userId: UUID, roleId: UUID) =>
    api<void>(`/groups/${groupId}/members/${userId}/roles/${roleId}`, { method: 'DELETE' }),

  /** --- Теги (CRUD) --- */
  tags: (groupId: UUID) => api<GroupTag[]>(`/groups/${groupId}/tags`),
  createTag: (groupId: UUID, payload: { name: string; color?: string }) =>
    api<GroupTag>(`/groups/${groupId}/tags`, { method: 'POST', body: JSON.stringify(payload) }),
  updateTag: (groupId: UUID, tagId: UUID, patch: Partial<{ name: string; color: string | null }>) =>
    api<GroupTag>(`/groups/${groupId}/tags/${tagId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteTag: (groupId: UUID, tagId: UUID) =>
    api<void>(`/groups/${groupId}/tags/${tagId}`, { method: 'DELETE' }),

  /** --- Быстрый поиск (in-memory index) --- */
  search: (groupId: UUID, params: { type: 'member' | 'tag'; q: string; limit?: number }) => {
    const q = new URLSearchParams();
    q.set('type', params.type);
    q.set('q', params.q);
    if (params.limit) q.set('limit', String(params.limit));
    return api<{ ids: UUID[] }>(`/groups/${groupId}/search?${q.toString()}`);
  },
  reindexSearch: (groupId: UUID) =>
    api<void>(`/groups/${groupId}/search/reindex`, { method: 'POST' }),
};

/** ===== Boards ===== */

export const BoardsAPI = {
  myBoards: () => api<Board[]>(`/me/boards`),
  create: (groupId: UUID, payload: { name: string; description?: string }) =>
    api<Board>(`/boards/group/${groupId}`, { method: 'POST', body: JSON.stringify(payload) }),
  get: (boardId: UUID) => api<Board>(`/boards/${boardId}`),
  delete: (boardId: UUID) => api<void>(`/boards/${boardId}`, { method: 'DELETE' }), // каскадом
};

/** ===== Tasks ===== */

export const TasksAPI = {
  list: (
    boardId: UUID,
    params?: { status?: TaskStatus; dueBefore?: string; label?: string; source?: TaskSource },
  ) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.dueBefore) q.set('dueBefore', params.dueBefore);
    if (params?.label) q.set('label', params.label);
    if (params?.source) q.set('source', params.source);
    const qs = q.toString();
    return api<Task[]>(`/tasks/board/${boardId}${qs ? `?${qs}` : ''}`);
  },

  create: (boardId: UUID, payload: Partial<Task> & { title: string }) =>
    api<Task>(`/tasks/board/${boardId}`, { method: 'POST', body: JSON.stringify(payload) }),

  update: (taskId: UUID, patch: Partial<Task>) =>
    api<Task>(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  remove: (taskId: UUID) => api<void>(`/tasks/${taskId}`, { method: 'DELETE' }),
};

export const IntegrationsAPI = {
  list: (groupId: UUID) => api<Integration[]>(`/groups/${groupId}/integrations`),

  create: (groupId: UUID, payload: IntegrationCreate) =>
    api<Integration>(`/groups/${groupId}/integrations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (groupId: UUID, id: UUID, patch: IntegrationPatch) =>
    api<Integration>(`/groups/${groupId}/integrations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  remove: (groupId: UUID, id: UUID) =>
    api<void>(`/groups/${groupId}/integrations/${id}`, { method: 'DELETE' }),

  rotateKey: (groupId: UUID, id: UUID) =>
    api<{ id: UUID; key: string }>(`/groups/${groupId}/integrations/${id}/rotate-key`, {
      method: 'POST',
    }),
};
