export type UUID = string;
export type IntegrationBuiltin = 'diadoc' | 'extern' | 'tolk';

export enum TaskStatus {
  TODO = 'todo',
  DOING = 'doing',
  DONE = 'done',
}

export enum TaskSource {
  MANUAL = 'manual',
  DIADOC = 'diadoc',
  TOLK = 'tolk',
  EXTERN = 'extern',
  FOCUS = 'focus',
}

export interface User {
  id: UUID;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface Group {
  id: UUID;
  name: string;
  description?: string | null;
  joinCode: string;
  owner: User;
}

export interface Board {
  id: UUID;
  name: string;
  description?: string | null;
  group: Group;
  createdBy: User;
}

export interface Task {
  id: UUID;
  board: Board;
  title: string;
  description?: string | null;
  status: TaskStatus;
  assignee?: string | null;
  due_at?: string | null; // ISO
  source: TaskSource;
  source_link?: string | null;
  labels?: string[] | null;
}
export type GroupMember = {
  id: UUID;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  role: 'owner' | 'admin' | 'member';
  roles?: RoleDef[];
};

export type RoleDef = {
  id: UUID;
  name: string;
  // флаги прав
  manageTags?: boolean;
  manageMembers?: boolean;
  assignRoles?: boolean;
};

export type GroupTag = {
  id: UUID;
  name: string;
  color?: string | null;
};

export type Integration = {
  id: UUID;
  group: { id: UUID };
  targetBoard: { id: UUID; name: string } | null;
  name: string;
  color: string; // HEX БЕЗ # (например 'FF8A00')
  trustedDomain: string | null;
  key: string; // Base62SecretKey
  isBuiltin: boolean;
  builtinType: IntegrationBuiltin | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationCreate = {
  name: string;
  color?: string; // HEX без '#'
  trustedDomain?: string | null;
  board_id: UUID; // обязательно
};

export type IntegrationPatch = Partial<{
  name: string; // для builtin менять нельзя — сервер вернёт 403
  color: string;
  trustedDomain: string | null;
  board_id: UUID;
  active: boolean;
}>;
