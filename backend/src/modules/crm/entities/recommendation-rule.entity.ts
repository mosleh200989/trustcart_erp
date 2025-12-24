import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum RulePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

@Entity('product_recommendation_rules')
export class RecommendationRule {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  rule_name!: string;

  @Column({ nullable: true })
  trigger_product_id!: number;

  @Column({ nullable: true })
  trigger_category_id!: number;

  @Column({ nullable: true })
  recommended_product_id!: number;

  @Column({ nullable: true })
  recommended_category_id!: number;

  @Column({ default: 7 })
  min_days_passed!: number;

  @Column({ default: 30 })
  max_days_passed!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  min_order_value!: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: RulePriority.MEDIUM
  })
  priority!: RulePriority;

  @Column({ default: true })
  is_active!: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  success_rate!: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
