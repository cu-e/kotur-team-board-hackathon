import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { GroupMember } from './GroupMember';
import { Board } from './Board';

@Entity({ name: 'users' })
@Index('idx_user_username', ['username'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  username!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 160, nullable: true })
  displayName?: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl?: string | null;

  @OneToMany(() => GroupMember, (gm) => gm.user)
  memberships!: GroupMember[];

  @OneToMany(() => Board, (b) => b.createdBy)
  createdBoards!: Board[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
