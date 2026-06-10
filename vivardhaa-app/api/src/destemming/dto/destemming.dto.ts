import { IsString, IsNumber, IsNotEmpty, IsOptional, Min } from 'class-validator';

export class CreateDestemmingJobDto {
  @IsString()
  @IsNotEmpty()
  purchaseId: string;

  @IsOptional()
  @IsString()
  initialNote?: string;

  @IsOptional()
  initialDispatches?: Array<{
    point: string;
    sentBags: number;
    sentKg: number;
    pricePerKg?: number;
  }>;
}

export class SendToPointDto {
  @IsString()
  @IsNotEmpty()
  point: string;

  @IsNumber()
  @Min(1)
  sentBags: number;

  @IsNumber()
  @Min(0.01)
  sentKg: number;

  /** ₹ per KG charged by the destemming point for this dispatch. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerKg?: number;

  /** Allowed shortage as a percentage of sentKg (e.g. 2 = 2%). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  shortagePct?: number;

  /** Gunny-bag tare weight per bag in KG (default 1.5). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  bagWeightKg?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ReceiveFromPointDto {
  /**
   * Stem-free output weight from this dispatch (the destemmed portion).
   * Provide when any part of the lot was returned stemless.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  receivedKg?: number;

  /**
   * Weight returned WITH stems still on — re-enters the unallocated pool.
   * Provide when any part of the lot comes back unfinished.
   */
  @IsOptional()
  @IsNumber()
  @Min(0)
  returnedStemKg?: number;

  /** Bags returned with stems. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  returnedStemBags?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AddNoteDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsString()
  point?: string;
}
