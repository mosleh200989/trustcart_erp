import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A/B test between two landing pages. Variant A's slug is the public URL;
 * while running, visitors are split client-side (sticky per browser).
 * Views are experiment-scoped counters; orders and revenue are computed
 * from sales_orders by each variant's utm_source within the run window.
 */
@Entity('lp_experiments')
export class LpExperiment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  // 'draft' | 'running' | 'completed'
  @Column({ length: 20, default: 'draft' })
  status!: string;

  @Column({ type: 'int' })
  variant_a_page_id!: number;

  @Column({ type: 'int' })
  variant_b_page_id!: number;

  // Percentage of traffic served variant A (the rest sees B)
  @Column({ type: 'int', default: 50 })
  traffic_split!: number;

  @Column({ type: 'int', default: 0 })
  a_views!: number;

  @Column({ type: 'int', default: 0 })
  b_views!: number;

  @Column({ type: 'int', nullable: true })
  winner_page_id!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  started_at!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  ended_at!: Date | null;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
