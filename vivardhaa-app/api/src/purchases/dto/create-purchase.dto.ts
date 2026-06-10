import { IsString, IsNumber, IsDateString, IsNotEmpty, IsOptional, Min, IsArray } from 'class-validator';

export class CreatePurchaseDto {
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
  @Min(0)
  bags?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
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
  @IsString()
  initialNote?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  bagWeights?: number[];

  /** When adding a lot to an existing group, pass the group's current stage (1–3).
   *  Defaults to 1 when omitted (brand-new purchase). */
  @IsOptional()
  @IsNumber()
  initialStage?: number;
}
