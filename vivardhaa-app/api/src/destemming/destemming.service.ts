import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DestemmingJob } from './destemming-job.entity';
import { PurchasesService } from '../purchases/purchases.service';
import {
  CreateDestemmingJobDto,
  SendToPointDto,
  ReceiveFromPointDto,
  AddNoteDto,
} from './dto/destemming.dto';

/**
 * Derive job status from its dispatches and the original input weight.
 *
 * A dispatch is "closed" when receivedAt is set (regardless of returnType).
 * With-stem returns put their KG back into the unallocated pool, so the job
 * is only 'received' when every dispatch is closed AND the pool is empty
 * (i.e. all stock has ultimately been returned stemless).
 *
 *   unallocatedKg = inputKg − Σ(sentKg) + Σ(returnedStemKg)
 */
function computeStatus(dispatches: any[], inputKg: number): string {
  if (dispatches.length === 0) return 'draft';

  const totalSentKg = dispatches.reduce((s: number, d: any) => s + d.sentKg, 0);
  const totalReturnedStemKg = dispatches.reduce(
    (s: number, d: any) => s + (d.returnedStemKg ?? 0),
    0,
  );
  const unallocatedKg = inputKg - totalSentKg + totalReturnedStemKg;

  const closedCount = dispatches.filter((d: any) => d.receivedAt != null).length;
  if (closedCount === 0) return 'sent';
  // Still partial if any dispatch is open OR returned-with-stem stock is sitting
  // in the pool waiting to be re-dispatched.
  if (closedCount < dispatches.length || unallocatedKg > 0.001) return 'partial';
  return 'received';
}

@Injectable()
export class DestemmingService {
  constructor(
    @InjectRepository(DestemmingJob)
    private readonly repo: Repository<DestemmingJob>,
    private readonly purchasesService: PurchasesService,
  ) {}

  async findAll(filters?: {
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
    variety?: string;
    status?: string;
  }): Promise<DestemmingJob[]> {
    const qb = this.repo.createQueryBuilder('d').orderBy('d.createdAt', 'DESC');

    if (filters?.date) {
      qb.andWhere('d.date = :date', { date: filters.date });
    } else if (filters?.rangeStart && filters?.rangeEnd) {
      qb.andWhere('d.date BETWEEN :start AND :end', {
        start: filters.rangeStart,
        end: filters.rangeEnd,
      });
    }
    if (filters?.variety) qb.andWhere('d.variety = :variety', { variety: filters.variety });
    if (filters?.status) qb.andWhere('d.status = :status', { status: filters.status });

    return qb.getMany();
  }

  async findOne(id: string): Promise<DestemmingJob> {
    const job = await this.repo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Destemming job ${id} not found`);
    return job;
  }

  async create(dto: CreateDestemmingJobDto): Promise<DestemmingJob> {
    const purchase = await this.purchasesService.findOne(dto.purchaseId);

    const now = new Date().toISOString();
    const dispatches = (dto.initialDispatches ?? []).map((d) => ({
      id: `dd-${uuidv4()}`,
      point: d.point,
      sentBags: d.sentBags,
      sentKg: d.sentKg,
      sentAt: now,
      ...(d.pricePerKg !== undefined ? { pricePerKg: d.pricePerKg } : {}),
    }));

    const job = this.repo.create({
      id: `d-${uuidv4()}`,
      purchaseId: purchase.id,
      shop: purchase.shop,
      variety: purchase.variety,
      type: purchase.type,
      mark: purchase.mark,
      inputBags: purchase.bags,
      inputKg: purchase.kg,
      sourcePricePerKg: purchase.price,
      destination: purchase.destination,
      date: new Date().toISOString().slice(0, 10),
      dispatches,
      status: computeStatus(dispatches, purchase.kg),
      notes: dto.initialNote
        ? [{ text: dto.initialNote.trim(), at: now }]
        : [],
    });

    return this.repo.save(job);
  }

  async sendToPoint(jobId: string, dto: SendToPointDto): Promise<DestemmingJob> {
    const job = await this.findOne(jobId);
    const now = new Date().toISOString();

    const dispatch = {
      id: `dd-${uuidv4()}`,
      point: dto.point,
      sentBags: dto.sentBags,
      sentKg: dto.sentKg,
      sentAt: now,
      pricePerKg: dto.pricePerKg,
      shortagePct: dto.shortagePct,
      bagWeightKg: dto.bagWeightKg,
      note: dto.note,
    };

    job.dispatches = [...job.dispatches, dispatch];
    job.status = computeStatus(job.dispatches, job.inputKg);

    const priceStr = dto.pricePerKg !== undefined ? ` @ ₹${dto.pricePerKg}/KG` : '';
    const autoText = `Sent ${dto.sentBags} bags / ${dto.sentKg} KG to ${dto.point}${priceStr}`;
    const noteText = dto.note ? `${autoText} — ${dto.note.trim()}` : autoText;
    job.notes = [...job.notes, { text: noteText, at: now, point: dto.point }];

    return this.repo.save(job);
  }

  async receiveFromPoint(
    jobId: string,
    dispatchId: string,
    dto: ReceiveFromPointDto,
  ): Promise<DestemmingJob> {
    const job = await this.findOne(jobId);
    const now = new Date().toISOString();

    const idx = job.dispatches.findIndex((d) => d.id === dispatchId);
    if (idx === -1) throw new NotFoundException(`Dispatch ${dispatchId} not found`);
    if (job.dispatches[idx].receivedAt) {
      throw new BadRequestException(`Dispatch ${dispatchId} has already been closed`);
    }

    const dispatch = job.dispatches[idx];

    const hasStemless = dto.receivedKg !== undefined && dto.receivedKg >= 0;
    const hasWithStem = dto.returnedStemKg !== undefined && dto.returnedStemKg >= 0;

    if (!hasStemless && !hasWithStem) {
      throw new BadRequestException(
        'Provide at least one of receivedKg (stemless) or returnedStemKg (with-stem)',
      );
    }
    if (hasStemless && dto.receivedKg > dispatch.sentKg) {
      throw new BadRequestException(
        `receivedKg (${dto.receivedKg}) cannot exceed sentKg (${dispatch.sentKg})`,
      );
    }
    if (hasWithStem && dto.returnedStemKg > dispatch.sentKg) {
      throw new BadRequestException(
        `returnedStemKg (${dto.returnedStemKg}) cannot exceed sentKg (${dispatch.sentKg})`,
      );
    }

    // Derive returnType from what was actually provided
    const returnType: 'stemless' | 'with-stem' | 'partial' =
      hasStemless && hasWithStem ? 'partial' : hasStemless ? 'stemless' : 'with-stem';

    job.dispatches = job.dispatches.map((d) =>
      d.id === dispatchId
        ? {
            ...d,
            returnType,
            ...(hasStemless ? { receivedKg: dto.receivedKg } : {}),
            ...(hasWithStem
              ? { returnedStemKg: dto.returnedStemKg, returnedStemBags: dto.returnedStemBags ?? 0 }
              : {}),
            receivedAt: now,
          }
        : d,
    );

    job.status = computeStatus(job.dispatches, job.inputKg);

    const parts: string[] = [];
    if (hasStemless) parts.push(`${dto.receivedKg} KG stemless`);
    if (hasWithStem)
      parts.push(`${dto.returnedStemKg} KG / ${dto.returnedStemBags ?? 0} bags with stems (re-enters pool)`);
    const autoText = `Received from ${dispatch.point} — ${parts.join(' + ')} (sent ${dispatch.sentKg} KG)`;
    const noteText = dto.note?.trim()
      ? `${autoText} — ${dto.note.trim()}`
      : autoText;
    job.notes = [...job.notes, { text: noteText, at: now, point: dispatch.point }];

    return this.repo.save(job);
  }

  async addNote(jobId: string, dto: AddNoteDto): Promise<DestemmingJob> {
    const job = await this.findOne(jobId);
    const now = new Date().toISOString();
    job.notes = [...job.notes, { text: dto.text, at: now, point: dto.point }];
    return this.repo.save(job);
  }
}
