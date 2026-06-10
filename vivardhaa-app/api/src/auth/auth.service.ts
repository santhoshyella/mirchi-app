import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { OtpRecord } from './otp-record.entity';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  private sns: SNSClient | null = null;

  constructor(
    @InjectRepository(OtpRecord)
    private otpRepo: Repository<OtpRecord>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    const isDevMode = config.get<string>('OTP_DEV_MODE') === 'true';
    if (!isDevMode) {
      this.sns = new SNSClient({
        region: config.get<string>('AWS_REGION', 'ap-south-1'),
      });
    }
  }

  async requestOtp(phone: string): Promise<{ message: string }> {
    // Check user exists and is active
    const user = await this.userRepo.findOne({ where: { phone } });
    if (!user) throw new BadRequestException('No account found with this phone number.');
    if (!user.isActive) throw new BadRequestException('Your account is inactive. Contact the admin.');

    // Invalidate any previous unused OTPs for this phone
    await this.otpRepo
      .createQueryBuilder()
      .update(OtpRecord)
      .set({ used: true })
      .where('phone = :phone AND used = false', { phone })
      .execute();

    // Generate 6-digit OTP (fixed 123456 in dev mode)
    const isDevMode = this.config.get<string>('OTP_DEV_MODE') === 'true';
    const code = isDevMode ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.otpRepo.save(this.otpRepo.create({ phone, code, expiresAt, used: false }));

    if (isDevMode) {
      console.log(`[DEV] OTP for ${phone}: ${code}`);
    } else {
      await this.sendSms(phone, `Your Vivardhaa OTP is ${code}. Valid for 10 minutes.`);
    }

    return { message: 'OTP sent successfully.' };
  }

  async verifyOtp(phone: string, otp: string): Promise<{ token: string }> {
    const record = await this.otpRepo.findOne({
      where: { phone, used: false },
      order: { createdAt: 'DESC' },
    });

    if (!record) throw new UnauthorizedException('Invalid or expired OTP.');
    if (record.expiresAt < new Date()) {
      await this.otpRepo.update(record.id, { used: true });
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }
    if (record.code !== otp) throw new UnauthorizedException('Incorrect OTP.');

    // Mark used
    await this.otpRepo.update(record.id, { used: true });

    // Fetch user for JWT payload
    const user = await this.userRepo.findOneOrFail({ where: { phone } });

    const payload = {
      sub: user.id,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      phone: user.phone,
      isAdmin: user.isAdmin,
      menuItems: user.menuItems,
    };

    const token = this.jwtService.sign(payload);
    return { token };
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    if (!this.sns) return;
    await this.sns.send(
      new PublishCommand({
        PhoneNumber: `+91${phone}`,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      }),
    );
  }
}
