import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RaasiBatch } from './raasi-batch.entity';
import { PurchasesService } from '../purchases/purchases.service';
import { DestemmingService } from '../destemming/destemming.service';
import { CreateRaasiBatchDto, MarkCollectedDto, AddRaasiNoteDto } from './dto/raasi.dto';

@Injectable()
export class RaasiService {
  constructor(
    @InjectRepository(RaasiBatch)
    private readonly repo: Repository<RaasiBatch>,
    private readonly purchasesService: PurchasesService,
    private readonly destemmingService: DestemmingService,
  ) {}

  async findAll(filters?: {
    date?: string;
    rangeStart?: string;
    rangeEnd?: string;
    variety?: string;
    status?: string;
    sourceType?: string;
  }): Promise<RaasiBatch[]> {
    const qb = this.repo.createQueryBuilder('r').orderBy('r.createdAt', 'DESC');

    if (filters?.date) {
      qb.andWhere('r.spreadDate = :date', { date: filters.date });
    } else if (filters?.rangeStart && filters?.rangeEnd) {
      qb.andWhere('r.spreadDate BETWEEN :start AND :end', {
        start: filters.rangeStart,
        end: filters.rangeEnd,
      });
    }
    if (filters?.variety) qb.andWhere('r.variety = :variety', { variety: filters.variety });
    if (filters?.status) qb.andWhere('r.status = :status', { status: filters.status });
    if (filters?.sourceType) qb.andWhere('r.sourceType = :sourceType', { sourceType: filters.sourceType });

    return qb.getMany();
  }

  async findOne(id: string): Promise<RaasiBatch> {
    const batch = await this.repo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException(`Raasi batch ${id} not found`);
    return batch;
  }

  async create(dto: CreateRaasiBatchDto): Promise<RaasiBatch> {
    if (!dto.sourceIds.length) throw new BadRequestException('sourceIds must not be empty');

    const now = new Date().toISOString();
    let primarySnapshot: { shop: string; variety: string; type: string; mark: string };

    if (dto.sourceType === 'purchase') {
      const first = await this.purchasesService.findOne(dto.sourceIds[0]);
      primarySnapshot = {
        shop:
          dto.sourceIds.length > 1
            ? `${first.shop} + ${dto.sourceIds.length - 1} more`
            : first.shop,
        variety: first.variety,
        type: first.type,
        mark: first.mark,
      };
    } else {
      const first = await this.destemmingService.findOne(dto.sourceIds[0]);
      primarySnapshot = {
        shop:
          dto.sourceIds.length > 1
            ? `${first.shop} + ${dto.sourceIds.length - 1} more`
            : first.shop,
        variety: first.variety,
        type: first.type,
        mark: first.mark,
      };
    }

    const batch = this.repo.create({
      id: `r-${uuidv4()}`,
      sourceType: dto.sourceType,
      sourceIds: dto.sourceIds,
      ...primarySnapshot,
      inputBags: dto.inputBags,
      inputWetKg: dto.inputWetKg,
      spreadDate: dto.spreadDate,
      status: 'drying',
      notes: dto.initialNote
        ? [{ text: dto.initialNote.trim(), at: now }]
        : [],
    });

    return this.repo.save(batch);
  }

  async markCollected(id: string, dto: MarkCollectedDto): Promise<RaasiBatch> {
    const batch = await this.findOne(id);
    if (batch.status === 'collected') throw new BadRequestException('Already collected');

    const now = new Date().toISOString();
    batch.status = 'collected';
    batch.outputDryKg = dto.outputDryKg;
    batch.collectedDate = now.slice(0, 10);

    if (dto.note) {
      batch.notes = [...batch.notes, { text: dto.note, at: now }];
    }

    return this.repo.save(batch);
  }

  async addNote(id: string, dto: AddRaasiNoteDto): Promise<RaasiBatch> {
    const batch = await this.findOne(id);
    const now = new Date().toISOString();
    batch.notes = [...batch.notes, { text: dto.text, at: now }];
    return this.repo.save(batch);
  }
}
