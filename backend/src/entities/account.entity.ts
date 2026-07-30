import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contact } from './contact.entity';
import { Opportunity } from './opportunity.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  type: string;

  @Column({ nullable: true })
  industry: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  managedBy: string;

  @Column({ default: 'active' })
  status: string;

  @OneToMany(() => Contact, (contact) => contact.account)
  contacts: Contact[];

  @OneToMany(() => Opportunity, (opportunity) => opportunity.account)
  opportunities: Opportunity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
