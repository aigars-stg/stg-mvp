import { vi } from 'vitest';

// Mock environment variables for all tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_mock_key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
process.env.EVERYPAY_API_USERNAME = 'test_api_username';
process.env.EVERYPAY_API_SECRET = 'test_api_secret';
process.env.EVERYPAY_API_URL = 'https://igw-demo.every-pay.com/api/v4';
process.env.EVERYPAY_ACCOUNT_NAME = 'test_account';
