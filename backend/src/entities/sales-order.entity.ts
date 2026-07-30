import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sales_orders')
export class SalesOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  quotationId: string;

  @Column({ nullable: true })
  customerName: string;

  @Column({ default: 'confirmed' })
  status: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'date', nullable: true })
  orderDate: string;

  @Column({ type: 'date', nullable: true })
  deliveryDate: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
