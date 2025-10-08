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
  WEBHOOK = 'webhook',
}

export enum GroupRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}
