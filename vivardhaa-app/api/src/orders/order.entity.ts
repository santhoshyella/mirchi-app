import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryColumn()
  id: string;

  @Column()
  customer: string;

  @Column({ name: 'destination_city', nullable: true })
  destinationCity?: string;

  @Column({ type: 'date' })
  date: string;

  @Column()
  variety: string;

  @Column()
  mark: string;

  @Column({ name: 'target_kg', type: 'numeric', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  targetKg: number;

  @Column({ name: 'price_per_kg', type: 'numeric', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  pricePerKg: number;

  @Column({ name: 'delivery_deadline', type: 'date', nullable: true })
  deliveryDeadline?: string;

  @Column({ name: 'current_stage', default: 1 })
  currentStage: number;

  @Column({ name: 'settled_at', nullable: true })
  settledAt?: string;

  @Column({ name: 'is_cancelled', default: false })
  isCancelled: boolean;

  @Column({ type: 'jsonb', default: '[]' })
  allocations: Array<{
    id: string;
    sourceKind: string;
    sourceId: string;
    shop: string;
    variety: string;
    type: string;
    mark: string;
    allocatedKg: number;
    allocatedAt: string;
    note?: string;
  }>;

  @Column({ type: 'jsonb', default: '[]' })
  notes: Array<{ stage: number; text: string; at: string }>;

  @Column({ name: 'stage_entered_at', type: 'jsonb', default: '{}' })
  stageEnteredAt: Record<string, string>;

  @Column({ name: 'stage_assignee', type: 'jsonb', default: '{}' })
  stageAssignee: Record<string, string>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
