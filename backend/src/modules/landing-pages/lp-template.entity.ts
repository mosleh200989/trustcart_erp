import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Reusable LP Maker layout: a saved block tree that seeds new builder
 * pages. Blocks shape is owned by frontend/src/components/lp-maker/blocks.ts.
 */
@Entity('lp_templates')
export class LpTemplate {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'text', nullable: true })
  thumbnail_url!: string;

  @Column({ type: 'jsonb', default: '[]' })
  blocks!: any[];

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
