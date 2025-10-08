import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { Group } from './Group';

@Entity({ name: 'group_roles' })
@Unique('uq_group_role_name', ['group', 'name'])
@Index('idx_group_role_group', ['group'])
export class RoleDef {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @ManyToOne(() => Group, (g) => g.id, { nullable: false, onDelete: 'CASCADE' })
  group!: Group;

  @Column({ type: 'varchar', length: 64 })
  name!: string;

  @Column({ type: 'boolean', default: false }) manageTags!: boolean;
  @Column({ type: 'boolean', default: false }) manageMembers!: boolean;
  @Column({ type: 'boolean', default: false }) assignRoles!: boolean;

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
