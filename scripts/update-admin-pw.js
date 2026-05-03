const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const adminEmail = 'user_01088888888@gmail.com';
  console.log('--- 기존 관리자 비밀번호 변경 ---');
  
  const { data: listData } = await supabase.auth.admin.listUsers();
  const adminUser = listData.users.find(u => u.email === adminEmail);
  
  if (adminUser) {
    await supabase.auth.admin.updateUserById(adminUser.id, { password: 'test1234' });
    console.log('관리자 비밀번호가 test1234로 변경되었습니다.');
  } else {
    console.error('해당 관리자를 찾을 수 없습니다.');
  }
}

main();
