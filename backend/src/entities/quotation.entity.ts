import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { QuotationItem } from './quotation-item.entity';

@Entity('quotations')
export class Quotation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  quoteNumber: string;

  @Column({ nullable: true })
  projectName: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ nullable: true })
  accountId: string;

  @Column({ nullable: true })
  opportunityId: string;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  taxPercent: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: 1 })
  revision: number;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ type: 'date', nullable: true })
  validUntil: string;

  @OneToMany(() => QuotationItem, (item) => item.quotation, { cascade: true })
  items: QuotationItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
