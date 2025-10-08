import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { Group } from './Group';
import { User } from './User';
import { GroupRole } from './enums';

@Entity({ name: 'group_members' })
@Unique('uq_group_user', ['group', 'user'])
@Index('idx_group_member_group', ['group'])
@Index('idx_group_member_user', ['user'])
export class GroupMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Group, (g) => g.members, { nullable: false, onDelete: 'CASCADE' })
  group!: Group;

  @ManyToOne(() => User, (u) => u.memberships, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @Column({ type: 'enum', enum: GroupRole, default: GroupRole.MEMBER })
  role!: GroupRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
