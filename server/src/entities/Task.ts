import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Board } from './Board';
import { Comment } from './Comment';
import { MeetingNote } from './MeetingNote';
import { TaskSource, TaskStatus } from './enums';
import { User } from './User';

@Entity({ name: 'tasks' })
@Index('idx_task_board_status', ['board', 'status'])
@Index('idx_task_due_at', ['dueAt'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Board, (b) => b.tasks, { onDelete: 'CASCADE', nullable: false })
  board!: Board;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.TODO,
  })
  status!: TaskStatus;

  // MVP-просто: имя исполнителя строкой (потом можно заменить на relation User)
  @Index('idx_task_assignee')
  @Column({ type: 'varchar', length: 120, nullable: true })
  assignee?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  assigneeUser?: User | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt?: Date | null;

  @Column({
    type: 'enum',
    enum: TaskSource,
    default: TaskSource.MANUAL,
  })
  source!: TaskSource;

  @Column({ name: 'source_link', type: 'varchar', length: 500, nullable: true })
  sourceLink?: string | null;

  // Доп. контекст источника: например {documentTitle, counterparty}
  @Column({ name: 'source_meta', type: 'simple-json', nullable: true })
  sourceMeta?: Record<string, any> | null;

  // Лейблы — как string[], простое хранение
  @Column({ type: 'simple-json', nullable: true })
  labels?: string[] | null;

  // Новые поля: от какой интеграции пришло (для подсветки на фронте)
  @Column({ name: 'origin_integration_id', type: 'varchar', length: 36, nullable: true })
  originIntegrationId?: string | null;

  @Column({ name: 'origin_name', type: 'varchar', length: 120, nullable: true })
  originName?: string | null;

  @Column({ name: 'origin_color', type: 'varchar', length: 16, nullable: true })
  originColor?: string | null;

  @ManyToOne(() => MeetingNote, (m) => m.tasks, { onDelete: 'SET NULL', nullable: true })
  meetingNote?: MeetingNote | null;

  @OneToMany(() => Comment, (c) => c.task, { cascade: ['insert', 'update'], onDelete: 'CASCADE' })
  comments!: Comment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
