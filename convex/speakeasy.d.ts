declare module 'speakeasy' {
  export interface GenerateSecretOptions {
    name?: string;
    issuer?: string;
    length?: number;
  }

  export interface GenerateSecretResult {
    base32: string;
    otpauth_url: string;
  }

  export interface VerifyOptions {
    secret: string;
    encoding?: string;
    token: string;
    window?: number;
  }

  export const generateSecret: (options: GenerateSecretOptions) => GenerateSecretResult;
  
  export const totp: {
    verify: (options: VerifyOptions) => boolean;
  };
}
