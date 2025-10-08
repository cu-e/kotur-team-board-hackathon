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
import { GroupMember } from './GroupMember';
import { User } from './User';
import { Board } from './Board';

@Entity({ name: 'groups' })
@Index('idx_group_name', ['name'])
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  // простой join-code для MVP (можно заменить на отдельные инвайты)
  @Index('idx_group_join_code', { unique: true })
  @Column({ name: 'join_code', type: 'varchar', length: 32, unique: true })
  joinCode!: string; // генерируй случайную строку

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  owner!: User;

  @OneToMany(() => GroupMember, (gm) => gm.group, {
    cascade: ['insert', 'update'],
    onDelete: 'CASCADE',
  })
  members!: GroupMember[];

  @OneToMany(() => Board, (b) => b.group, { cascade: ['insert', 'update'], onDelete: 'CASCADE' })
  boards!: Board[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
