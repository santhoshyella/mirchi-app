import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('purchases')
export class Purchase {
  @PrimaryColumn()
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = `p-${uuidv4()}`;
  }

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'source_type' })
  sourceType: string;

  @Column({ nullable: true })
  shop?: string;

  @Column({ name: 'source_details', type: 'text', nullable: true })
  sourceDetails?: string;

  @Column()
  variety: string;

  @Column()
  type: string;

  @Column()
  mark: string;

  @Column({ nullable: true, default: 0 })
  bags: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, default: 0, transformer: { to: (v) => v, from: (v) => v == null ? 0 : parseFloat(v) } })
  kg: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  price: number;

  @Column({ nullable: true })
  destination: string;

  @Column({ name: 'destination_details', type: 'text', nullable: true })
  destinationDetails?: string;

  @Column({ name: 'dispatch_deadline', type: 'date', nullable: true })
  dispatchDeadline: string;

  @Column({ name: 'current_stage', default: 1 })
  currentStage: number;

  @Column({ default: 30 })
  probability: number;

  @Column({ name: 'is_rejected', default: false })
  isRejected: boolean;

  @Column({ name: 'rejection_reason', nullable: true })
  rejectionReason?: string;

  @Column({ name: 'rejection_note', nullable: true })
  rejectionNote?: string;

  @Column({ type: 'jsonb', default: '[]' })
  notes: Array<{ stage: number; text: string; at: string; kind?: 'lot' | 'workflow' }>;

  @Column({ name: 'stage_entered_at', type: 'jsonb', default: '{}' })
  stageEnteredAt: Record<string, string>;

  @Column({ name: 'stage_assignee', type: 'jsonb', default: '{}' })
  stageAssignee: Record<string, string>;

  @Column({ name: 'bag_weights', type: 'jsonb', nullable: true, default: null })
  bagWeights?: number[];

  @Column({ name: 'accounts_status', nullable: true })
  accountsStatus?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
