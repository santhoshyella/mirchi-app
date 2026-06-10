import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Variety } from './variety.entity';
import { Mark } from './mark.entity';
import {
  CreateMarkDto,
  CreateVarietyDto,
  UpdateMarkDto,
  UpdateVarietyDto,
} from './dto/varieties.dto';

@Injectable()
export class VarietiesService {
  constructor(
    @InjectRepository(Variety) private readonly varietyRepo: Repository<Variety>,
    @InjectRepository(Mark) private readonly markRepo: Repository<Mark>,
  ) {}

  // ── Varieties ─────────────────────────────────────────────────────────────

  findAllVarieties(): Promise<Variety[]> {
    return this.varietyRepo.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      relations: ['marks'],
    });
  }

  async findOneVariety(id: string): Promise<Variety> {
    const v = await this.varietyRepo.findOne({ where: { id }, relations: ['marks'] });
    if (!v) throw new NotFoundException(`Variety ${id} not found`);
    return v;
  }

  async createVariety(dto: CreateVarietyDto): Promise<Variety> {
    const existing = await this.varietyRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException(`Variety "${dto.name}" already exists`);
    const v = this.varietyRepo.create({
      name: dto.name,
      color: dto.color ?? '#6b7280',
      subtitle: dto.subtitle ?? '',
      sortOrder: dto.sortOrder ?? 0,
    });
    const saved = await this.varietyRepo.save(v);
    return this.findOneVariety(saved.id);
  }

  async updateVariety(id: string, dto: UpdateVarietyDto): Promise<Variety> {
    const v = await this.findOneVariety(id);
    if (dto.name !== undefined) v.name = dto.name;
    if (dto.color !== undefined) v.color = dto.color;
    if (dto.subtitle !== undefined) v.subtitle = dto.subtitle;
    if (dto.sortOrder !== undefined) v.sortOrder = dto.sortOrder;
    const saved = await this.varietyRepo.save(v);
    return this.findOneVariety(saved.id);
  }

  async deleteVariety(id: string): Promise<void> {
    const v = await this.findOneVariety(id);
    await this.varietyRepo.remove(v);
  }

  // ── Marks ─────────────────────────────────────────────────────────────────

  async findMarksForVariety(varietyId: string): Promise<Mark[]> {
    await this.findOneVariety(varietyId); // 404 guard
    return this.markRepo.find({
      where: { varietyId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async createMark(varietyId: string, dto: CreateMarkDto): Promise<Mark> {
    await this.findOneVariety(varietyId); // 404 guard
    const m = this.markRepo.create({
      name: dto.name,
      label: dto.label ?? dto.name,
      sortOrder: dto.sortOrder ?? 0,
      varietyId,
    });
    return this.markRepo.save(m);
  }

  async updateMark(varietyId: string, markId: string, dto: UpdateMarkDto): Promise<Mark> {
    const m = await this.markRepo.findOne({ where: { id: markId, varietyId } });
    if (!m) throw new NotFoundException(`Mark ${markId} not found in variety ${varietyId}`);
    if (dto.name !== undefined) m.name = dto.name;
    if (dto.label !== undefined) m.label = dto.label;
    if (dto.sortOrder !== undefined) m.sortOrder = dto.sortOrder;
    return this.markRepo.save(m);
  }

  async deleteMark(varietyId: string, markId: string): Promise<void> {
    const m = await this.markRepo.findOne({ where: { id: markId, varietyId } });
    if (!m) throw new NotFoundException(`Mark ${markId} not found`);
    await this.markRepo.remove(m);
  }
}
