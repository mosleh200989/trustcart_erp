import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('email_subscribers')
export class EmailSubscriber {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: false })
  email!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @CreateDateColumn()
  subscribed_at!: Date;

  @Column({ type: 'timestamp', nullable: true })
  unsubscribed_at?: Date;
}
