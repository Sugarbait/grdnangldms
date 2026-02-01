declare module "crypto-js" {
  interface WordArray {
    words: number[];
    sigBytes: number;
    toString(encoding?: any): string;
  }

  interface PBKDF2Options {
    keySize?: number;
    iterations?: number;
  }

  interface CryptoJSStatic {
    lib: {
      WordArray: {
        random(size: number): WordArray;
        create(data: any): WordArray;
      };
    };
    AES: {
      encrypt(message: string | WordArray, key: string): any;
      decrypt(ciphertext: any, key: string): WordArray;
    };
    PBKDF2(password: string, salt: string, options?: PBKDF2Options): WordArray;
    enc: {
      Utf8: any;
    };
  }

  const CryptoJS: CryptoJSStatic;
  export default CryptoJS;
}
