import { vi } from 'vitest';

// Mock environment variables for all tests
process.env.STRIPE_SECRET_KEY = 'sk_test_mock_key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service_role_mock_key';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
