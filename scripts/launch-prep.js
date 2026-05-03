const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const env = fs.readFileSync(envPath, 'utf8');

const supabaseUrlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const supabaseKeyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error("환경 변수 NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY를 찾을 수 없습니다.");
  process.exit(1);
}

const supabaseUrl = supabaseUrlMatch[1].trim().replace(/^"|"$/g, '');
const supabaseKey = supabaseKeyMatch[1].trim().replace(/^"|"$/g, '');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  console.log('=================================');
  console.log('정식 오픈 준비 데이터 정리 스크립트');
  console.log('=================================');

  try {
    // 1. 일일 실천현황(daily_practice_logs) 및 수련 기록(training_records) 모두 삭제
    console.log('\n[1] 일일 실천현황 및 수련 기록 데이터 삭제 중...');
    
    // UUID인 user_id를 기준으로 모든 레코드 삭제 (dummy uuid와 일치하지 않는 모든 것)
    const dummyUuid = '00000000-0000-0000-0000-000000000000';
    
    console.log(' - daily_practice_logs 테이블 삭제 시작');
    const { error: err1 } = await supabase.from('daily_practice_logs').delete().neq('user_id', dummyUuid);
    if (err1) {
      console.log('   ❌ daily_practice_logs 삭제 에러:', err1.message);
    } else {
      console.log('   ✅ daily_practice_logs 데이터 삭제 완료.');
    }

    console.log(' - training_records 테이블 삭제 시작');
    const { error: err2 } = await supabase.from('training_records').delete().neq('user_id', dummyUuid);
    if (err2) {
      console.log('   ❌ training_records 삭제 에러:', err2.message);
    } else {
      console.log('   ✅ training_records 데이터 삭제 완료.');
    }

    // 2. 테스트 사용자 삭제
    console.log('\n[2] 테스트 사용자 목록 조회 중...');
    let { data: { users }, error: errUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    
    if (errUsers) {
      console.log('❌ 유저 목록 조회 에러:', errUsers.message);
      return;
    }

    let deletedCount = 0;
    for (const user of users) {
      const name = user.user_metadata?.name || '';
      if (name.toLowerCase().startsWith('test') || name.startsWith('테스트')) {
        console.log(`   - 삭제 대상 발견: ${name} (${user.email || '이메일없음'})`);
        const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
        if (delErr) {
          console.log(`     ❌ 삭제 실패: ${delErr.message}`);
        } else {
          console.log(`     ✅ 삭제 완료`);
          deletedCount++;
        }
      }
    }
    console.log(`\n✅ 총 ${deletedCount}명의 테스트 사용자 삭제를 완료했습니다.`);

    // 3. "정덕순" 사용자 이름 쉼표 제거
    console.log('\n[3] "정덕순" 사용자 이름 수정 중...');
    let fixedCount = 0;
    for (const user of users) {
      const name = user.user_metadata?.name || '';
      // 이름에 정덕순이 포함되어 있고 쉼표로 시작하거나 쉼표가 붙어있는 경우
      if (name.includes('정덕순') && name.includes(',')) {
        console.log(`   - 대상 발견: 현재 이름 = "${name}"`);
        const newName = name.replace(/,/g, '').trim(); // 모든 쉼표 제거
        const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { ...user.user_metadata, name: newName }
        });
        if (updateErr) {
          console.log(`     ❌ 수정 실패: ${updateErr.message}`);
        } else {
          console.log(`     ✅ 이름 수정 완료: "${name}" -> "${newName}"`);
          fixedCount++;
        }
      }
    }
    if (fixedCount === 0) {
      console.log('   ℹ️ 수정할 "정덕순" 사용자를 찾지 못했거나 이미 정상입니다.');
    } else {
      console.log(`\n✅ 총 ${fixedCount}명의 사용자 이름을 수정했습니다.`);
    }

    console.log('\n=================================');
    console.log('모든 정식 오픈 준비 작업이 완료되었습니다!');
    console.log('=================================');

  } catch (err) {
    console.error('\n스크립트 실행 중 에러 발생:', err);
  }
}

run();
