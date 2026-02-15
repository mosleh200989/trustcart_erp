import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('printer_settings')
export class PrinterSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'printer_name', type: 'varchar', length: 255 })
  printerName!: string;

  @Column({ name: 'printer_type', type: 'varchar', length: 50, default: 'thermal' })
  printerType!: string; // 'thermal' | 'inkjet' | 'laser'

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ name: 'paper_size', type: 'varchar', length: 50, default: '80mm' })
  paperSize!: string; // '80mm' | '58mm' | 'A4' | 'A5' | '100x150mm'

  @Column({ name: 'sticker_width', type: 'int', default: 100 })
  stickerWidth!: number; // mm

  @Column({ name: 'sticker_height', type: 'int', default: 150 })
  stickerHeight!: number; // mm

  @Column({ name: 'invoice_header', type: 'text', nullable: true })
  invoiceHeader!: string | null;

  @Column({ name: 'invoice_footer', type: 'text', nullable: true })
  invoiceFooter!: string | null;

  @Column({ name: 'company_name', type: 'varchar', length: 255, nullable: true })
  companyName!: string | null;

  @Column({ name: 'company_address', type: 'text', nullable: true })
  companyAddress!: string | null;

  @Column({ name: 'company_phone', type: 'varchar', length: 50, nullable: true })
  companyPhone!: string | null;

  @Column({ name: 'company_email', type: 'varchar', length: 255, nullable: true })
  companyEmail!: string | null;

  @Column({ name: 'company_logo_url', type: 'varchar', length: 1000, nullable: true })
  companyLogoUrl!: string | null;

  @Column({ name: 'show_logo', type: 'boolean', default: true })
  showLogo!: boolean;

  @Column({ name: 'show_barcode', type: 'boolean', default: true })
  showBarcode!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
