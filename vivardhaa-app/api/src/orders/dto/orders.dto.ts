import { IsString, IsNumber, IsNotEmpty, IsOptional, IsArray, IsDateString, Min } from 'class-validator';

export class AddAllocationDto {
  @IsString()
  @IsNotEmpty()
  sourceKind: string;

  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsString()
  @IsNotEmpty()
  shop: string;

  @IsString()
  @IsNotEmpty()
  variety: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  mark: string;

  @IsNumber()
  @Min(0.01)
  allocatedKg: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customer: string;

  @IsOptional()
  @IsString()
  destinationCity?: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  variety: string;

  @IsString()
  @IsNotEmpty()
  mark: string;

  @IsNumber()
  @Min(0.01)
  targetKg: number;

  @IsNumber()
  @Min(0.01)
  pricePerKg: number;

  @IsOptional()
  @IsDateString()
  deliveryDeadline?: string;

  @IsOptional()
  @IsString()
  initialNote?: string;

  @IsOptional()
  @IsArray()
  initialAllocations?: AddAllocationDto[];
}

export class AdvanceOrderDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class SettleOrderDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class CancelOrderDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class AssignOrderDto {
  @IsString()
  assignee: string;

  @IsOptional()
  @IsNumber()
  stage?: number;
}
