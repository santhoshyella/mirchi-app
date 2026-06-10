import { IsString, IsNumber, IsDateString, IsNotEmpty, IsOptional, Min, IsArray } from 'class-validator';

export class UpdatePurchaseDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  sourceType: string;

  @IsOptional()
  @IsString()
  shop?: string;

  @IsOptional()
  @IsString()
  sourceDetails?: string;

  @IsString()
  @IsNotEmpty()
  variety: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  mark: string;

  @IsOptional()
  @IsNumber()
  bags?: number;

  @IsOptional()
  @IsNumber()
  kg?: number;

  @IsNumber()
  @Min(0.01)
  price: number;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  destinationDetails?: string;

  @IsOptional()
  @IsDateString()
  dispatchDeadline?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  bagWeights?: number[];

  @IsOptional()
  @IsString()
  remark?: string;
}
