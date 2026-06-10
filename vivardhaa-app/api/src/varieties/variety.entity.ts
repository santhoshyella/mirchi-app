import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Mark } from './mark.entity';

@Entity('varieties')
export class Variety {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  /** Hex colour used in the UI dot / card. */
  @Column({ default: '#6b7280' })
  color: string;

  /** Short description shown as a subtitle in the card picker. */
  @Column({ nullable: true })
  subtitle: string;

  @Column({ default: 0 })
  sortOrder: number;

  @OneToMany(() => Mark, (mark) => mark.variety, { cascade: true, eager: true })
  marks: Mark[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
