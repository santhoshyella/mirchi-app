export class CreateRoleDto {
  name: string;
  description?: string;
  permissions?: Record<string, any>;
}

export class UpdateRoleDto {
  name?: string;
  description?: string;
  permissions?: Record<string, any>;
}
