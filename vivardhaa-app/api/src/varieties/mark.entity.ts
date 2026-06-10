import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Variety } from './variety.entity';

@Entity('marks')
export class Mark {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  /** Human-friendly label shown in selects, e.g. "AA — Top grade". */
  @Column({ nullable: true })
  label: string;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToOne(() => Variety, (variety) => variety.marks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'varietyId' })
  variety: Variety;

  /** Explicit FK column so queries can filter by varietyId without a join. */
  @Column({ nullable: false })
  varietyId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
