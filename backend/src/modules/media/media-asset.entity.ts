import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * A file in the shared media library. Uploads go through the existing
 * /upload/image endpoint (Cloudinary); this table is the browsable index —
 * search, reuse, copy-URL — that raw uploads never had.
 */
@Entity('media_assets')
export class MediaAsset {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  url!: string;

  @Column({ length: 500, nullable: true })
  filename!: string;

  @Column({ length: 100, nullable: true })
  mime!: string;

  @Column({ type: 'int', nullable: true })
  size_bytes!: number;

  @Column({ type: 'int', nullable: true })
  uploaded_by!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;
}
