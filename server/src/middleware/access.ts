import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../datasource';
import { Board } from '../entities/Board';
import { GroupMember } from '../entities/GroupMember';

export async function ensureBoardAccess(req: Request, res: Response, next: NextFunction) {
  const boardId = req.params.boardId || (req.body && req.body.board_id);
  if (!boardId) return res.status(400).json({ error: 'BOARD_ID_REQUIRED' });
  const board = await AppDataSource.getRepository(Board).findOne({
    where: { id: boardId },
    relations: ['group'],
  });
  if (!board) return res.status(404).json({ error: 'BOARD_NOT_FOUND' });
  const gm = await AppDataSource.getRepository(GroupMember).findOne({
    where: { group: { id: board.group.id }, user: { id: req.userId } },
  });
  if (!gm) return res.status(403).json({ error: 'FORBIDDEN' });
  // @ts-ignore
  req.board = board;
  return next();
}

export async function ensureGroupAccess(req: Request, res: Response, next: NextFunction) {
  const groupId = req.params.groupId || (req.body && req.body.group_id);
  if (!groupId) return res.status(400).json({ error: 'GROUP_ID_REQUIRED' });
  const gm = await AppDataSource.getRepository(GroupMember).findOne({
    where: { group: { id: groupId }, user: { id: req.userId } },
  });
  if (!gm) return res.status(403).json({ error: 'FORBIDDEN' });
  return next();
}
