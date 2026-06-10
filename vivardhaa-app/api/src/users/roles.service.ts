import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role, RolePermissions, EMPTY_PERMISSIONS } from './role.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

const all = { view: true, create: true, edit: true, advance: true };
const viewOnly = { view: true, create: false, edit: false, advance: false };
const viewAdvance = { view: true, create: false, edit: false, advance: true };
const viewEdit = { view: true, create: false, edit: true, advance: true };
const off = { view: false, create: false, edit: false, advance: false };

const DEFAULT_ROLES: Array<{
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystem?: boolean;
}> = [
  {
    name: 'Admin',
    description: 'Full access including user & role management',
    isSystem: true,
    permissions: { inward: all, destemming: all, raasi: all, orders: all, setup: all, userManagement: all },
  },
  {
    name: 'Manager',
    description: 'All operational modules + manage users, not roles',
    permissions: { inward: all, destemming: all, raasi: all, orders: all, setup: all, userManagement: all },
  },
  {
    name: 'Purchase team',
    description: 'Create + advance inward purchases',
    permissions: { inward: all, destemming: viewOnly, raasi: viewOnly, orders: viewOnly, setup: off, userManagement: off },
  },
  {
    name: 'Machule team',
    description: 'Inward stage 2 — quality check',
    permissions: { inward: viewEdit, destemming: off, raasi: off, orders: off, setup: off, userManagement: off },
  },
  {
    name: 'Weighing team',
    description: 'Inward stage 3 — confirm weight',
    permissions: { inward: viewEdit, destemming: off, raasi: off, orders: off, setup: off, userManagement: off },
  },
  {
    name: 'Loading team',
    description: 'Inward stage 4 — hand over to vehicle',
    permissions: { inward: viewEdit, destemming: off, raasi: off, orders: off, setup: off, userManagement: off },
  },
  {
    name: 'Accounts team',
    description: 'Stage 6 inward + order settlement only',
    permissions: { inward: viewAdvance, destemming: viewOnly, raasi: viewOnly, orders: viewAdvance, setup: off, userManagement: off },
  },
  {
    name: 'Godown incharge',
    description: 'Full access to destemming and raasi',
    permissions: { inward: viewOnly, destemming: all, raasi: all, orders: viewOnly, setup: off, userManagement: off },
  },
  {
    name: 'Sales team',
    description: 'Full access to outward orders',
    permissions: { inward: viewOnly, destemming: viewOnly, raasi: viewOnly, orders: all, setup: off, userManagement: off },
  },
  {
    name: 'Viewer',
    description: 'Read-only access across all modules',
    isSystem: true,
    permissions: { inward: viewOnly, destemming: viewOnly, raasi: viewOnly, orders: viewOnly, setup: off, userManagement: off },
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {}

  async onModuleInit() {
    for (const def of DEFAULT_ROLES) {
      const exists = await this.repo.findOne({ where: { name: def.name } });
      if (!exists) {
        await this.repo.save(this.repo.create(def));
      }
    }
  }

  findAll(): Promise<Role[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.repo.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const exists = await this.repo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`Role "${dto.name}" already exists`);
    const permissions: RolePermissions = { ...EMPTY_PERMISSIONS, ...(dto.permissions ?? {}) } as RolePermissions;
    return this.repo.save(this.repo.create({ name: dto.name, description: dto.description, permissions }));
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    if (dto.name && dto.name !== role.name) {
      const exists = await this.repo.findOne({ where: { name: dto.name } });
      if (exists) throw new ConflictException(`Role "${dto.name}" already exists`);
      role.name = dto.name;
    }
    if (dto.description !== undefined) role.description = dto.description;
    if (dto.permissions) {
      const existing = role.permissions || EMPTY_PERMISSIONS;
      role.permissions = { ...existing, ...(dto.permissions as any) } as RolePermissions;
    }
    return this.repo.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystem) throw new BadRequestException(`System role "${role.name}" cannot be deleted`);
    await this.repo.delete(id);
  }

  async getUserCountByRole(): Promise<Record<string, number>> {
    const result: Array<{ roleId: string; count: string }> = await this.repo
      .createQueryBuilder('role')
      .leftJoin('users', 'u', 'u."roleId" = role.id')
      .select('role.id', 'roleId')
      .addSelect('COUNT(u.id)', 'count')
      .groupBy('role.id')
      .getRawMany();
    return Object.fromEntries(result.map((r) => [r.roleId, parseInt(r.count, 10)]));
  }
}
