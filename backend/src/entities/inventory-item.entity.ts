import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sku: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  materialType: string;

  @Column({ nullable: true })
  unit: string;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0 })
  quantityOnHand: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0 })
  reorderLevel: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  unitCost: number;

  @Column({ nullable: true })
  location: string;

  @Column({ default: 'raw' })
  inventoryType: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
