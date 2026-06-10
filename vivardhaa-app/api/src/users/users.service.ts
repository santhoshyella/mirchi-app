import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async onModuleInit() {
    const admin = await this.repo.findOne({ where: { isAdmin: true } });
    if (!admin) {
      await this.repo.save(
        this.repo.create({
          firstName: 'Admin',
          lastName: '',
          username: 'admin',
          phone: '9535181920',
          isActive: true,
          isAdmin: true,
          menuItems: ['*'],
        }),
      );
    }
  }

  findAll(search?: string): Promise<User[]> {
    if (search) {
      return this.repo.find({
        where: [
          { firstName: ILike(`%${search}%`) },
          { lastName: ILike(`%${search}%`) },
          { username: ILike(`%${search}%`) },
          { phone: ILike(`%${search}%`) },
        ],
        order: { isAdmin: 'DESC', firstName: 'ASC', lastName: 'ASC' },
      });
    }
    return this.repo.find({
      order: { isAdmin: 'DESC', firstName: 'ASC', lastName: 'ASC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async generateUsername(firstName: string, lastName: string): Promise<string> {
    const base = ((firstName || '') + (lastName ? '.' + lastName : ''))
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9.]/g, '');

    const all = await this.repo
      .createQueryBuilder('u')
      .where('u.username LIKE :pattern', { pattern: base + '%' })
      .select('u.username')
      .getMany();

    const taken = new Set(all.map((u) => u.username));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(base + n)) n++;
    return base + n;
  }

  async checkUsername(
    username: string,
  ): Promise<{ available: boolean; suggestion?: string }> {
    const existing = await this.repo.findOne({ where: { username } });
    if (!existing) return { available: true };
    let n = 2;
    while (await this.repo.findOne({ where: { username: username + n } })) n++;
    return { available: false, suggestion: username + n };
  }

  async create(dto: CreateUserDto): Promise<User> {
    const username = await this.generateUsername(
      dto.firstName,
      dto.lastName ?? '',
    );
    const user = this.repo.create({
      firstName: dto.firstName,
      lastName: dto.lastName ?? '',
      username,
      phone: dto.phone || null,
      email: dto.email || null,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      isAdmin: false,
      menuItems: dto.menuItems ?? [],
    });
    return this.repo.save(user);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    if (user.isAdmin) {
      // Admin's menuItems and isAdmin flag are immutable
      if (dto.isActive !== undefined) user.isActive = dto.isActive;
      return this.repo.save(user);
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.isActive !== undefined) user.isActive = dto.isActive;
    if (dto.menuItems !== undefined) user.menuItems = dto.menuItems;
    return this.repo.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    if (user.isAdmin) {
      throw new Error('Admin user cannot be deleted');
    }
    await this.repo.remove(user);
  }
}
