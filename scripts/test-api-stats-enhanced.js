const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStats(email, password, isAdmin) {
  console.log(`\n--- [${email}] 로그인 및 통계 검증 ---`);
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('로그인 실패:', error.message);
    return;
  }
  
  const token = data.session.access_token;
  
  const statsRes = await fetch('http://localhost:3000/api/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const statsData = await statsRes.json();
  console.log('[나의 빛 통계 응답]:', JSON.stringify(statsData, null, 2));

  if (isAdmin) {
    const adminRes = await fetch('http://localhost:3000/api/admin/stats?type=total', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const adminData = await adminRes.json();
    console.log('[관리자: 전체 통계 응답 Raw]:', JSON.stringify(adminData, null, 2));

    const adminStatsRes = await fetch('http://localhost:3000/api/admin/stats?type=user', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const adminStatsData = await adminStatsRes.json();
    console.log('[관리자: 도반별 통계 응답 대상자수]:', adminStatsData.userStats?.length);
  }
}

async function main() {
  await checkStats('user_01000000001@gmail.com', 'test1234', false);
  await checkStats('user_01088888888@gmail.com', 'test1234', true);
}

main();
