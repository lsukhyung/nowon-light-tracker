// 테스트 스크립트
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('URL 또는 Service Role Key가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('--- 이벤트 목록 조회 ---');
  let { data, error } = await supabase.from('events').select('*');
  console.log('GET Result:', data, error);

  console.log('\n--- 이벤트 생성 ---');
  let res = await supabase.from('events').insert({ name: '테스트 이벤트', light_threshold: 100 }).select();
  console.log('POST Result:', res.data, res.error);
}

test();
