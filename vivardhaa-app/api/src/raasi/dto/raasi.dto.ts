import { IsString, IsNumber, IsNotEmpty, IsOptional, IsArray, IsDateString, Min } from 'class-validator';

export class CreateRaasiBatchDto {
  @IsString()
  @IsNotEmpty()
  sourceType: string;

  @IsArray()
  @IsString({ each: true })
  sourceIds: string[];

  @IsNumber()
  @Min(1)
  inputBags: number;

  @IsNumber()
  @Min(0.01)
  inputWetKg: number;

  @IsDateString()
  spreadDate: string;

  @IsOptional()
  @IsString()
  initialNote?: string;
}

export class MarkCollectedDto {
  @IsNumber()
  @Min(0.01)
  outputDryKg: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AddRaasiNoteDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
