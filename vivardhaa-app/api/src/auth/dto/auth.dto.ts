import { IsString, Length, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone must be a 10-digit number' })
  phone: string;
}

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\d{10}$/, { message: 'Phone must be a 10-digit number' })
  phone: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be 6 digits' })
  otp: string;
}
