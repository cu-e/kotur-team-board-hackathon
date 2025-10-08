import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Task } from './Task';
import { MeetingNote } from './MeetingNote';
import { Group } from './Group';
import { User } from './User';

@Entity({ name: 'boards' })
@Index('idx_board_name', ['name'])
@Index('idx_board_group', ['group'])
export class Board {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(() => Group, (g) => g.boards, { nullable: false, onDelete: 'CASCADE' })
  group!: Group;

  @ManyToOne(() => User, (u) => u.createdBoards, { nullable: false, onDelete: 'SET NULL' })
  createdBy!: User;

  @OneToMany(() => Task, (t) => t.board, { cascade: ['insert', 'update'], onDelete: 'CASCADE' })
  tasks!: Task[];

  @OneToMany(() => MeetingNote, (m) => m.board, {
    cascade: ['insert', 'update'],
    onDelete: 'CASCADE',
  })
  meetingNotes!: MeetingNote[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
