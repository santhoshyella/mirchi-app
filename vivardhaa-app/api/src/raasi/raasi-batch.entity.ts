import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('raasi_batches')
export class RaasiBatch {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'source_type' })
  sourceType: string;

  @Column({ name: 'source_ids', type: 'jsonb', default: '[]' })
  sourceIds: string[];

  @Column({ nullable: true })
  shop: string;

  @Column()
  variety: string;

  @Column()
  type: string;

  @Column()
  mark: string;

  @Column({ name: 'input_bags' })
  inputBags: number;

  @Column({ name: 'input_wet_kg', type: 'numeric', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  inputWetKg: number;

  @Column({ name: 'spread_date', type: 'date' })
  spreadDate: string;

  @Column({ name: 'collected_date', type: 'date', nullable: true })
  collectedDate?: string;

  @Column({ name: 'output_dry_kg', type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: { to: (v) => v, from: (v) => v !== null ? parseFloat(v) : null } })
  outputDryKg?: number;

  @Column({ default: 'drying' })
  status: string;

  @Column({ type: 'jsonb', default: '[]' })
  notes: Array<{ text: string; at: string }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
