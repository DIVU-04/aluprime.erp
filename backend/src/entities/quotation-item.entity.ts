import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Quotation } from './quotation.entity';

@Entity('quotation_items')
export class QuotationItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  designId: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  productType: string;

  @Column({ nullable: true })
  system: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  width: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1 })
  height: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalPrice: number;

  @ManyToOne(() => Quotation, (quotation) => quotation.items, {
    onDelete: 'CASCADE',
  })
  quotation: Quotation;

  @Column()
  quotationId: string;
}
