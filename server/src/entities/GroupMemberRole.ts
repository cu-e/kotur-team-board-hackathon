import { Entity, PrimaryGeneratedColumn, ManyToOne, Unique, Index } from 'typeorm';
import { Group } from './Group';
import { User } from './User';
import { RoleDef } from './RoleDef';

@Entity({ name: 'group_member_roles' })
@Unique('uq_member_role', ['group', 'user', 'role'])
@Index('idx_member_role_group_user', ['group', 'user'])
export class GroupMemberRole {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @ManyToOne(() => Group, (g) => g.id, { nullable: false, onDelete: 'CASCADE' })
  group!: Group;

  @ManyToOne(() => User, (u) => u.id, { nullable: false, onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => RoleDef, (r) => r.id, { nullable: false, onDelete: 'CASCADE' })
  role!: RoleDef;
}
