import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';

@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  value: number;

  @Column({ default: 'lead' })
  stage: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  assignedTo: string;

  @Column({ type: 'date', nullable: true })
  expectedCloseDate: string;

  @ManyToOne(() => Account, (account) => account.opportunities, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  account: Account;

  @Column({ nullable: true })
  accountId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
