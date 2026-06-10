import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  advance: boolean;
}

export interface RolePermissions {
  inward: ModulePermission;
  destemming: ModulePermission;
  raasi: ModulePermission;
  orders: ModulePermission;
  setup: ModulePermission;
  userManagement: ModulePermission;
}

export const EMPTY_PERMISSIONS: RolePermissions = {
  inward:         { view: false, create: false, edit: false, advance: false },
  destemming:     { view: false, create: false, edit: false, advance: false },
  raasi:          { view: false, create: false, edit: false, advance: false },
  orders:         { view: false, create: false, edit: false, advance: false },
  setup:          { view: false, create: false, edit: false, advance: false },
  userManagement: { view: false, create: false, edit: false, advance: false },
};

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  permissions: RolePermissions;

  @Column({ default: false })
  isSystem: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
