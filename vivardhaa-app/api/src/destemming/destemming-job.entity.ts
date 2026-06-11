import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('destemming_jobs')
export class DestemmingJob {
  @PrimaryColumn()
  id: string;

  @Column({ name: 'purchase_id' })
  purchaseId: string;

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

  @Column({ name: 'input_kg', type: 'numeric', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  inputKg: number;

  @Column({ name: 'source_price_per_kg', type: 'numeric', precision: 10, scale: 2, transformer: { to: (v) => v, from: (v) => parseFloat(v) } })
  sourcePricePerKg: number;

  @Column({ nullable: true })
  destination: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'jsonb', default: '[]' })
  dispatches: Array<{
    id: string;
    point: string;
    sentBags: number;
    sentKg: number;
    sentAt: string;
    /**
     * How the stock was returned from the destemming point.
     *   'stemless'  → job done; receivedKg holds the clean output weight.
     *   'with-stem' → returned unfinished (e.g. end-of-day); returnedStemKg /
     *                 returnedStemBags re-enter the unallocated pool so the lot
     *                 can be re-dispatched the next day.
     * Undefined while the dispatch is still in flight.
     */
    returnType?: 'stemless' | 'with-stem' | 'partial';
    /** Stem-free output weight (set when returnType === 'stemless'). */
    receivedKg?: number;
    /** Weight returned WITH stems still attached (set when returnType === 'with-stem'). */
    returnedStemKg?: number;
    /** Bags returned with stems (set when returnType === 'with-stem'). */
    returnedStemBags?: number;
    /** ISO timestamp set for both return types when the dispatch is closed. */
    receivedAt?: string;
    /** ₹ per KG charged by the destemming point for this dispatch. */
    pricePerKg?: number;
    /** Allowed shortage as a percentage of sentKg (e.g. 2 = 2%). */
    shortagePct?: number;
    /** Gunny-bag tare weight per bag in KG (default 1.5). */
    bagWeightKg?: number;
    note?: string;
  }>;

  @Column({ default: 'draft' })
  status: string;

  @Column({ type: 'jsonb', default: '[]' })
  notes: Array<{ text: string; at: string; point?: string }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
