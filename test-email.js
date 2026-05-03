// test.js
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testEmail(email) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password: 'password123!@',
    });
    console.log(`Email check for ${email}:`, error ? error.message : "Success");
}

async function run() {
    await testEmail('testy@example.com');
    await testEmail('user_01032141050@jongrolight.com');
    await testEmail('01032141050@example.com');
}
run();
