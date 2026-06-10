import { IsOptional, IsString, IsNumber } from 'class-validator';

export class AdvancePurchaseDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class RejectPurchaseDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SettlePurchaseDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class RequestInfoDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class AssignPurchaseDto {
  @IsString()
  assignee: string;

  @IsOptional()
  @IsNumber()
  stage?: number;
}

export class AddNoteDto {
  @IsString()
  text: string;
}
