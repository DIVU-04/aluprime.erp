import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column({ nullable: true })
  opportunityId: string;

  @Column()
  siteName: string;

  @Column({ nullable: true })
  siteAddress: string;

  @Column({ nullable: true })
  surveyorName: string;

  @Column({ type: 'date', nullable: true })
  surveyDate: string;

  @Column({ default: 'scheduled' })
  status: string;

  @Column({ type: 'text', nullable: true })
  checklistData: string;

  @Column({ type: 'text', nullable: true })
  measurements: string;

  @Column({ type: 'text', nullable: true })
  photos: string;

  @Column({ nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
