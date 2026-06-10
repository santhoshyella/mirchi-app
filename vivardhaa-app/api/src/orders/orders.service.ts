import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Order } from './order.entity';
import {
  CreateOrderDto,
  AdvanceOrderDto,
  SettleOrderDto,
  CancelOrderDto,
  AddAllocationDto,
  AssignOrderDto,
} from './dto/orders.dto';

const DEFAULT_ADVANCE_NOTE: Record<number, string> = {
  1: 'Inventory allocated.',
  2: 'Loaded · dispatched to customer.',
  3: 'Delivered · awaiting payment settlement.',
  4: '',
};

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly repo: Repository<Order>,
  ) {}

  async findAll(filters?: {
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
    variety?: string;
    stage?: number;
    customer?: string;
  }): Promise<Order[]> {
    const qb = this.repo.createQueryBuilder('o').orderBy('o.createdAt', 'DESC');

    if (filters?.date) {
      qb.andWhere('o.date = :date', { date: filters.date });
    } else if (filters?.rangeStart && filters?.rangeEnd) {
      qb.andWhere('o.date BETWEEN :start AND :end', {
        start: filters.rangeStart,
        end: filters.rangeEnd,
      });
    }
    if (filters?.variety) qb.andWhere('o.variety = :variety', { variety: filters.variety });
    if (filters?.stage !== undefined) qb.andWhere('o.currentStage = :stage', { stage: filters.stage });
    if (filters?.customer) qb.andWhere('o.customer ILIKE :customer', { customer: `%${filters.customer}%` });

    return qb.getMany();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.repo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  async create(dto: CreateOrderDto): Promise<Order> {
    const now = new Date().toISOString();
    const allocations = (dto.initialAllocations ?? []).map((a) => ({
      id: `oa-${uuidv4()}`,
      sourceKind: a.sourceKind,
      sourceId: a.sourceId,
      shop: a.shop,
      variety: a.variety,
      type: a.type,
      mark: a.mark,
      allocatedKg: a.allocatedKg,
      allocatedAt: now,
      note: a.note,
    }));

    const order = this.repo.create({
      id: `o-${uuidv4()}`,
      customer: dto.customer,
      destinationCity: dto.destinationCity,
      date: dto.date,
      variety: dto.variety,
      mark: dto.mark,
      targetKg: dto.targetKg,
      pricePerKg: dto.pricePerKg,
      deliveryDeadline: dto.deliveryDeadline,
      currentStage: 1,
      isCancelled: false,
      allocations,
      notes: dto.initialNote
        ? [{ stage: 1, text: dto.initialNote.trim(), at: now }]
        : [],
      stageEnteredAt: { 1: now },
      stageAssignee: {},
    });

    return this.repo.save(order);
  }

  async advance(id: string, dto: AdvanceOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.isCancelled) throw new BadRequestException('Order is cancelled');
    if (order.currentStage >= 4) throw new BadRequestException('Already at final stage');

    const nextStage = order.currentStage + 1;
    const now = new Date().toISOString();
    const noteText = dto.remark?.trim() || DEFAULT_ADVANCE_NOTE[order.currentStage];

    order.currentStage = nextStage;
    order.stageEnteredAt = { ...order.stageEnteredAt, [nextStage]: now };
    if (noteText) {
      order.notes = [...order.notes, { stage: order.currentStage - 1, text: noteText, at: now }];
    }

    return this.repo.save(order);
  }

  async settle(id: string, dto: SettleOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.currentStage !== 4) throw new BadRequestException('Order must be at stage 4 to settle');
    if (order.isCancelled) throw new BadRequestException('Cancelled orders cannot be settled');

    const now = new Date().toISOString();
    const noteText = dto.remark?.trim() || 'Payment received · settled.';
    order.settledAt = now;
    order.notes = [...order.notes, { stage: 4, text: noteText, at: now }];

    return this.repo.save(order);
  }

  async cancel(id: string, dto: CancelOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    if (order.isCancelled) throw new BadRequestException('Already cancelled');

    const now = new Date().toISOString();
    order.isCancelled = true;
    order.notes = [
      ...order.notes,
      { stage: order.currentStage, text: dto.reason || 'Cancelled.', at: now },
    ];

    return this.repo.save(order);
  }

  async addAllocation(id: string, dto: AddAllocationDto): Promise<Order> {
    const order = await this.findOne(id);
    const now = new Date().toISOString();

    const allocation = {
      id: `oa-${uuidv4()}`,
      sourceKind: dto.sourceKind,
      sourceId: dto.sourceId,
      shop: dto.shop,
      variety: dto.variety,
      type: dto.type,
      mark: dto.mark,
      allocatedKg: dto.allocatedKg,
      allocatedAt: now,
      note: dto.note,
    };

    order.allocations = [...order.allocations, allocation];
    return this.repo.save(order);
  }

  async removeAllocation(orderId: string, allocId: string): Promise<Order> {
    const order = await this.findOne(orderId);
    const exists = order.allocations.find((a) => a.id === allocId);
    if (!exists) throw new NotFoundException(`Allocation ${allocId} not found`);

    order.allocations = order.allocations.filter((a) => a.id !== allocId);
    return this.repo.save(order);
  }

  async assign(id: string, dto: AssignOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    const stage = dto.stage ?? order.currentStage;
    const now = new Date().toISOString();

    order.stageAssignee = { ...order.stageAssignee, [stage]: dto.assignee };
    const noteText = dto.assignee
      ? `Assigned to ${dto.assignee} at stage ${stage}.`
      : `Unassigned at stage ${stage}.`;
    order.notes = [...order.notes, { stage, text: noteText, at: now }];

    return this.repo.save(order);
  }
}
