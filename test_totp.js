import speakeasy from "speakeasy";

// Test with a known secret - this is a standard test vector
// Secret: JBSWY3DPEBLW64TMMQ====== (base32)
// This generates predictable codes

console.log("Testing TOTP Implementation with Speakeasy\n");

// Generate a secret
const secret = speakeasy.generateSecret({
  name: "Guardian Angel DMS Test",
  issuer: "Guardian Angel DMS",
});

console.log("Generated Secret (base32):", secret.base32);
console.log("QR Code URL:", secret.otpauth_url);

// Generate the current TOTP code
const currentToken = speakeasy.totp({
  secret: secret.base32,
  encoding: "base32",
  step: 30, // 30-second window
});

console.log("\nCurrent TOTP Code:", currentToken);

// Verify the code we just generated
const isValid = speakeasy.totp.verify({
  secret: secret.base32,
  encoding: "base32",
  token: currentToken,
  window: 2,
});

console.log("Verification Result:", isValid ? "PASS ✓" : "FAIL ✗");

// Test with the standard test vector from RFC 6238
// Secret: JBSWY3DPEBLW64TMMQ====== 
// At time 59 (in 30-second intervals = 1769 seconds)
// Expected code: 287082

console.log("\n--- RFC 6238 Test Vector ---");
const testSecret = "JBSWY3DPEBLW64TMMQ======";

// Generate code for time 59 (1770 seconds = 59 * 30)
const testCode = speakeasy.totp({
  secret: testSecret,
  encoding: "base32",
  time: 59 * 30, // 1770 seconds
});

console.log("Secret:", testSecret);
console.log("Time (seconds):", 59 * 30);
console.log("Generated Code:", testCode);
console.log("Expected Code: 287082");

// Try to verify this code as if it was provided at that time
const testIsValid = speakeasy.totp.verify({
  secret: testSecret,
  encoding: "base32",
  token: testCode,
  time: 59 * 30,
  window: 0, // No window for exact time
});

console.log("Verification at exact time:", testIsValid ? "PASS ✓" : "FAIL ✗");

// Test with current time
const currentTestCode = speakeasy.totp({
  secret: testSecret,
  encoding: "base32",
});

const currentTestValid = speakeasy.totp.verify({
  secret: testSecret,
  encoding: "base32",
  token: currentTestCode,
  window: 2,
});

console.log("\n--- Current Time Test ---");
console.log("Current Code:", currentTestCode);
console.log("Verification with window=2:", currentTestValid ? "PASS ✓" : "FAIL ✗");

console.log("\nAll tests completed!");
