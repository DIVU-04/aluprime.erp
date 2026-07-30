import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('production_batches')
export class ProductionBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  batchNumber: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  salesOrderId: string;

  @Column({ default: 'scheduled' })
  status: string;

  @Column({ type: 'date', nullable: true })
  scheduledDate: string;

  @Column({ type: 'date', nullable: true })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  completionDate: string;

  @Column({ type: 'int', default: 0 })
  totalUnits: number;

  @Column({ type: 'int', default: 0 })
  completedUnits: number;

  @Column({ nullable: true })
  assignedLine: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
