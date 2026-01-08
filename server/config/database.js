import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
    console.warn('Warning: SUPABASE_URL not configured. Using mock mode.');
}

// Create anon client (respects RLS)
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Create service role client (bypasses RLS) - use for admin operations
// WARNING: Never expose the service key to the frontend!
export const supabaseAdmin = supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

// Helper to get the appropriate client
// Use admin client for operations that need to bypass RLS (like creating profiles)
export const getClient = (useAdmin = false) => {
    if (useAdmin && supabaseAdmin) {
        return supabaseAdmin;
    }
    return supabase;
};

export default supabase;
