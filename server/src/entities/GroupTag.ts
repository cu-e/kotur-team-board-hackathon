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

@Entity({ name: 'group_tags' })
@Unique('uq_group_tag_name', ['group', 'name'])
@Index('idx_group_tag_group', ['group'])
export class GroupTag {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Group, (g) => g.id, { nullable: false, onDelete: 'CASCADE' })
  group!: Group;

  @Column({ type: 'varchar', length: 64 })
  name!: string; // уникально в рамках группы

  @Column({ type: 'varchar', length: 16, nullable: true })
  color?: string | null; // hex без #, например 'FF8A00'

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
