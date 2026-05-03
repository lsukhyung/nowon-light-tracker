import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: 'user_01032141050@nowonlight.com',
      password: 'password123',
    });
    console.log("DATA:", data);
    console.log("ERROR:", error);
  } catch(e) {
    console.log("EXC:", e);
  }
}
await test();
