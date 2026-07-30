import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('designs')
export class Design {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  productType: string;

  @Column({ nullable: true })
  system: string;

  @Column({ nullable: true })
  profile: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1200 })
  width: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1500 })
  height: number;

  @Column({ type: 'int', default: 1 })
  panels: number;

  @Column({ nullable: true })
  openingType: string;

  @Column({ nullable: true })
  glassType: string;

  @Column({ nullable: true })
  hardware: string;

  @Column({ nullable: true })
  color: string;

  @Column({ type: 'text', nullable: true })
  designJson: string;

  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 })
  estimatedCost: number;

  @Column({ nullable: true })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
