import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Maps a custom domain to what it serves: a whole storefront page tree or
 * a single landing page at the root URL. The Next.js middleware reads
 * /storefront-domains/public/map (cached) instead of hardcoded constants,
 * so pointing a new campaign domain no longer needs a code deploy.
 */
@Entity('storefront_domains')
export class StorefrontDomain {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255, unique: true })
  domain!: string;

  // 'storefront' | 'landing_page'
  @Column({ length: 20 })
  target_type!: string;

  @Column({ type: 'int', nullable: true })
  storefront_id!: number | null;

  @Column({ type: 'int', nullable: true })
  landing_page_id!: number | null;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
