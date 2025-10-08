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
import { Task } from './Task';

@Entity({ name: 'meeting_notes' })
@Index('idx_meeting_board', ['board'])
export class MeetingNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Board, (b) => b.meetingNotes, { onDelete: 'CASCADE', nullable: false })
  board!: Board;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ name: 'raw_transcript', type: 'text' })
  rawTranscript!: string;

  @OneToMany(() => Task, (t) => t.meetingNote)
  tasks!: Task[];

  @Column({ name: 'parsed_at', type: 'timestamptz', nullable: true })
  parsedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
