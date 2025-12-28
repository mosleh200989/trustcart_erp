import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('deal_stages')
export class DealStage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'display_order' })
  displayOrder: number;

  @Column({ default: 50 })
  probability: number;

  @Column({ name: 'is_closed', default: false })
  isClosed: boolean;

  @Column({ name: 'is_won', default: false })
  isWon: boolean;

  @Column({ nullable: true })
  color: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
