import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Task } from './Task';

@Entity({ name: 'comments' })
@Index('idx_comment_task', ['task'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Task, (t) => t.comments, { onDelete: 'CASCADE', nullable: false })
  task!: Task;

  @Column({ type: 'varchar', length: 120 })
  author!: string; // MVP: просто имя

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
