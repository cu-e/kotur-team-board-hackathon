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
import { Board } from './Board';

export type BuiltinType = 'diadoc' | 'extern' | 'tolk' | null;

@Entity({ name: 'integrations' })
@Unique('uq_integration_key', ['key'])
@Unique('uq_integration_name_in_group', ['group', 'name'])
export class Integration {
  @PrimaryGeneratedColumn('uuid') id!: string;

  @ManyToOne(() => Group, (g) => g.id, { nullable: false, onDelete: 'CASCADE' })
  @Index('idx_integration_group')
  group!: Group;

  @ManyToOne(() => Board, (b) => b.id, { nullable: true, onDelete: 'SET NULL' })
  targetBoard?: Board | null; // куда создавать задачи по умолчанию

  @Column({ type: 'varchar', length: 120 })
  name!: string; // например, «Контур.Диадок» или «Биллинг»

  @Column({ type: 'varchar', length: 16, nullable: true })
  color?: string | null; // HEX без #, например 'FF8A00'

  @Column({ type: 'varchar', length: 200, nullable: true })
  trustedDomain?: string | null; // example.com (проверяется по заголовку X-Webhook-Domain/Origin)

  @Column({ type: 'varchar', length: 64 })
  key!: string; // секрет в URL: /hooks/:key

  @Column({ type: 'boolean', default: false })
  isBuiltin!: boolean;

  @Column({ type: 'varchar', length: 16, nullable: true })
  builtinType?: BuiltinType; // 'diadoc' | 'extern' | 'tolk' | null

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
}
