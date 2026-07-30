import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('dispatches')
export class Dispatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  dispatchNumber: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  salesOrderId: string;

  @Column({ nullable: true })
  batchId: string;

  @Column({ default: 'pending' })
  status: string;

  @Column({ type: 'date', nullable: true })
  dispatchDate: string;

  @Column({ nullable: true })
  vehicleNumber: string;

  @Column({ nullable: true })
  driverName: string;

  @Column({ nullable: true })
  destination: string;

  @Column({ type: 'int', default: 0 })
  totalItems: number;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
