import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('order_guard_settings')
export class OrderGuardSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'window_minutes', type: 'int', default: 10 })
  windowMinutes!: number;

  @Column({ name: 'block_note_html', type: 'text' })
  blockNoteHtml!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
