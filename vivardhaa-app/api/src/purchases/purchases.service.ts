import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Purchase } from './purchase.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import {
  AdvancePurchaseDto,
  RejectPurchaseDto,
  SettlePurchaseDto,
  RequestInfoDto,
  AssignPurchaseDto,
  AddNoteDto,
} from './dto/purchase-action.dto';

const PROBABILITY_AT_STAGE: Record<number, number> = {
  1: 30, 2: 30, 3: 70, 4: 100, 5: 100, 6: 100,
};

const DEFAULT_ADVANCE_NOTE: Record<number, string> = {
  1: 'Sent to Machule team.',
  2: 'Cleared Machule.',
  3: 'Weight confirmed.',
  4: 'Handed over to vehicle.',
  5: 'Received at destination.',
  6: '',
};

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly repo: Repository<Purchase>,
  ) {}

  async findAll(filters?: {
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
    variety?: string;
    stage?: number;
  }): Promise<Purchase[]> {
    const qb = this.repo.createQueryBuilder('p').orderBy('p.createdAt', 'DESC');

    if (filters?.date) {
      qb.andWhere('p.date = :date', { date: filters.date });
    } else if (filters?.rangeStart && filters?.rangeEnd) {
      qb.andWhere('p.date BETWEEN :start AND :end', {
        start: filters.rangeStart,
        end: filters.rangeEnd,
      });
    }
    if (filters?.variety) {
      qb.andWhere('p.variety = :variety', { variety: filters.variety });
    }
    if (filters?.stage !== undefined) {
      qb.andWhere('p.currentStage = :stage', { stage: filters.stage });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Purchase> {
    const item = await this.repo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Purchase ${id} not found`);
    return item;
  }

  async create(dto: CreatePurchaseDto): Promise<Purchase> {
    const now = new Date().toISOString();
    // When adding a lot to an existing group, start it at the group's current stage.
    const initialStage = Math.min(Math.max(dto.initialStage ?? 1, 1), 3);
    const purchase = this.repo.create({
      id: `p-${uuidv4()}`,
      date: dto.date,
      sourceType: dto.sourceType,
      shop: dto.shop,
      sourceDetails: dto.sourceDetails,
      variety: dto.variety,
      type: dto.type,
      mark: dto.mark,
      bags: dto.bags,
      kg: dto.kg,
      price: dto.price,
      bagWeights: dto.bagWeights ?? null,
      destination: dto.destination,
      destinationDetails: dto.destinationDetails,
      dispatchDeadline: dto.dispatchDeadline,
      currentStage: initialStage,
      probability: PROBABILITY_AT_STAGE[initialStage] ?? 30,
      isRejected: false,
      notes: dto.initialNote
        ? [{ stage: initialStage, text: dto.initialNote.trim(), at: now, kind: 'lot' }]
        : [],
      stageEnteredAt: { [initialStage]: now },
      stageAssignee: {},
    });
    return this.repo.save(purchase);
  }

  async update(id: string, dto: UpdatePurchaseDto): Promise<Purchase> {
    const item = await this.findOne(id);
    if (item.currentStage > 3) {
      throw new BadRequestException('Items past the Weighing stage (stage 3) cannot be edited');
    }
    // Source header fields (date, sourceType, shop, sourceDetails) are only
    // editable at stage 1 — lot fields remain editable up to stage 3.
    if (item.currentStage === 1) {
      item.date = dto.date;
      item.sourceType = dto.sourceType;
      item.shop = dto.shop ?? null;
      item.sourceDetails = dto.sourceDetails ?? null;
    }
    item.variety = dto.variety;
    item.type = dto.type;
    item.mark = dto.mark;
    item.bags = dto.bags;
    item.kg = dto.kg;
    item.price = dto.price;
    item.bagWeights = dto.bagWeights ?? null;
    item.destination = dto.destination;
    item.destinationDetails = dto.destinationDetails ?? null;
    item.dispatchDeadline = dto.dispatchDeadline;
    if (dto.remark?.trim()) {
      const now = new Date().toISOString();
      item.notes = [...(item.notes ?? []), { stage: 1, text: dto.remark.trim(), at: now, kind: 'lot' }];
    }
    await this.repo.save(item);
    // Reload from DB to guarantee jsonb columns (notes etc.) are fresh in the response.
    return this.findOne(id);
  }

  async advance(id: string, dto: AdvancePurchaseDto): Promise<Purchase> {
    const item = await this.findOne(id);
    if (item.currentStage >= 6) throw new BadRequestException('Already at final stage');

    const nextStage = item.currentStage + 1;
    const now = new Date().toISOString();
    const noteText = dto.remark?.trim() || DEFAULT_ADVANCE_NOTE[item.currentStage];

    item.currentStage = nextStage;
    // Rejected lots keep probability = 0; only update probability for non-rejected lots.
    if (!item.isRejected) {
      item.probability = PROBABILITY_AT_STAGE[nextStage] ?? 100;
    }
    item.stageEnteredAt = { ...item.stageEnteredAt, [nextStage]: now };
    // accountsStatus is only set for non-rejected lots reaching stage 6.
    if (nextStage === 6 && !item.isRejected) item.accountsStatus = 'pending';
    if (noteText) {
      item.notes = [...(item.notes ?? []), { stage: item.currentStage - 1, text: noteText, at: now, kind: 'workflow' }];
    }

    await this.repo.save(item);
    return this.findOne(id);
  }

  async reject(id: string, dto: RejectPurchaseDto): Promise<Purchase> {
    const item = await this.findOne(id);
    if (item.isRejected) throw new BadRequestException('Already rejected');

    const now = new Date().toISOString();
    item.isRejected = true;
    item.probability = 0;
    item.rejectionReason = dto.reason;
    item.rejectionNote = dto.note;
    item.notes = [
      ...(item.notes ?? []),
      { stage: item.currentStage, text: dto.note || dto.reason || 'Rejected.', at: now, kind: 'workflow' },
    ];

    await this.repo.save(item);
    return this.findOne(id);
  }

  async settle(id: string, dto: SettlePurchaseDto): Promise<Purchase> {
    const item = await this.findOne(id);
    if (item.currentStage !== 6) throw new BadRequestException('Only stage-6 items can be settled');
    if (item.isRejected) throw new BadRequestException('Rejected items cannot be settled');

    const now = new Date().toISOString();
    const noteText = dto.remark?.trim() || 'Validated · payment settled.';
    item.accountsStatus = 'settled';
    item.notes = [...(item.notes ?? []), { stage: 6, text: noteText, at: now, kind: 'workflow' }];

    await this.repo.save(item);
    return this.findOne(id);
  }

  async requestInfo(id: string, dto: RequestInfoDto): Promise<Purchase> {
    const item = await this.findOne(id);
    if (item.currentStage !== 6) throw new BadRequestException('Only stage-6 items');

    const now = new Date().toISOString();
    const noteText = dto.remark?.trim() || 'Holding for more info.';
    item.accountsStatus = 'info-requested';
    item.notes = [...(item.notes ?? []), { stage: 6, text: noteText, at: now, kind: 'workflow' }];

    await this.repo.save(item);
    return this.findOne(id);
  }

  async addNote(id: string, dto: AddNoteDto): Promise<Purchase> {
    const item = await this.findOne(id);
    const now = new Date().toISOString();
    item.notes = [
      ...(item.notes ?? []),
      { stage: item.currentStage, text: dto.text.trim(), at: now, kind: 'lot' },
    ];
    await this.repo.save(item);
    return this.findOne(id);
  }

  async assign(id: string, dto: AssignPurchaseDto): Promise<Purchase> {
    const item = await this.findOne(id);
    const stage = dto.stage ?? item.currentStage;
    const now = new Date().toISOString();

    item.stageAssignee = { ...item.stageAssignee, [stage]: dto.assignee };
    const noteText = dto.assignee
      ? `Assigned to ${dto.assignee} at stage ${stage}.`
      : `Unassigned at stage ${stage}.`;
    item.notes = [...(item.notes ?? []), { stage, text: noteText, at: now, kind: 'workflow' }];

    await this.repo.save(item);
    return this.findOne(id);
  }
}
