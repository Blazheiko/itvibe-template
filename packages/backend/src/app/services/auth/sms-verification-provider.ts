import { authConfig } from '#config/auth.js';

export type SmsVerificationFlow = 'register_phone' | 'reset_phone' | 'link_phone';

export interface IssueSmsVerificationInput {
  phone: string;
  flow: SmsVerificationFlow;
}

export interface IssueSmsVerificationResult {
  code: string;
  providerRequestId: string;
}

export interface SmsVerificationProvider {
  issueVerificationCode(
    input: IssueSmsVerificationInput,
  ): Promise<IssueSmsVerificationResult>;
}

interface FakeSmsDelivery extends IssueSmsVerificationInput, IssueSmsVerificationResult {
  sentAt: Date;
}

class FakeSmsVerificationProvider implements SmsVerificationProvider {
  private deliveries: FakeSmsDelivery[] = [];

  async issueVerificationCode(
    input: IssueSmsVerificationInput,
  ): Promise<IssueSmsVerificationResult> {
    const code = authConfig.fakeSmsCode;
    const delivery = {
      ...input,
      code,
      providerRequestId: `fake-${this.deliveries.length + 1}`,
      sentAt: new Date(),
    };

    this.deliveries.push(delivery);

    return {
      code: delivery.code,
      providerRequestId: delivery.providerRequestId,
    };
  }

  latestForPhone(phone: string): FakeSmsDelivery | undefined {
    return [...this.deliveries].reverse().find((entry) => entry.phone === phone);
  }

  reset(): void {
    this.deliveries = [];
  }
}

export const fakeSmsVerificationProvider = new FakeSmsVerificationProvider();

class UnsupportedSmsVerificationProvider implements SmsVerificationProvider {
  async issueVerificationCode(): Promise<IssueSmsVerificationResult> {
    throw new Error('Unsupported SMS verification provider configuration');
  }
}
export const smsVerificationProvider: SmsVerificationProvider =
  authConfig.smsProvider === 'fake'
    ? fakeSmsVerificationProvider
    : new UnsupportedSmsVerificationProvider();
