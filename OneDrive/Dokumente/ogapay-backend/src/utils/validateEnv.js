'use strict';

const REQUIRED_VARS = {
  'DATABASE_URL': 'PostgreSQL connection string (required for Prisma)',
  'JWT_SECRET': 'JWT signing secret (min 32 chars)',
  'PLATFORM_FEE_PERCENT': 'Platform fee percentage (default 10)',
  'FRONTEND_URL': 'Frontend URL for CORS and redirects',
};

const OPTIONAL_VARS = {
  'PAYSTACK_SECRET_KEY': 'Paystack API secret for payment processing',
  'FLUTTERWAVE_SECRET_KEY': 'Flutterwave API secret',
  'IMAGEKIT_PUBLIC_KEY': 'ImageKit public key for file uploads',
  'IMAGEKIT_PRIVATE_KEY': 'ImageKit private key',
  'IMAGEKIT_URL_ENDPOINT': 'ImageKit URL endpoint',
  'OPENAI_API_KEY': 'OpenAI API key for AI features',
  'SMTP_HOST': 'SMTP server hostname for email',
  'SMTP_PORT': 'SMTP port (default 587)',
  'SMTP_USER': 'SMTP username',
  'SMTP_PASS': 'SMTP password',
  'SMTP_FROM': 'From address for emails',
  'NODE_ENV': 'development | production | test',
  'API_VERSION': 'API version (default v1)',
  'ACCESS_TOKEN_EXPIRY': 'JWT access token expiry (default 15m)',
  'REFRESH_TOKEN_EXPIRY': 'JWT refresh token expiry (default 7d)',
};

function validateEnv() {
  const missing = [];
  
  for (const [key, description] of Object.entries(REQUIRED_VARS)) {
    if (!process.env[key]) {
      missing.push(`  ❌ ${key} — ${description}`);
    }
  }

  // JWT_SECRET must be at least 32 characters
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn(`  ⚠️  JWT_SECRET is only ${process.env.JWT_SECRET.length} chars. Minimum 32 recommended.`);
  }

  if (missing.length > 0) {
    console.error('\n❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach(m => console.error(m));
    console.error('\nSee .env.example for all available options.');
    process.exit(1);
  }

  console.log('✅ All required environment variables present');
}

module.exports = { validateEnv, REQUIRED_VARS, OPTIONAL_VARS };
