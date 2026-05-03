const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const generateRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function main() {
  console.log('--- 테스트 데이터 생성 시작 ---');

  // 1. 기본 실천과제 불러오기
  const { data: defaultItems, error: itemsError } = await supabase
    .from('practice_items')
    .select('*')
    .eq('is_default', true);

  if (itemsError) {
    console.error('Error fetching default items:', itemsError);
    return;
  }

  const currentDate = new Date(); // 오늘 기준

  for (let i = 1; i <= 5; i++) {
    const rawId = `0100000000${i}`;
    const email = `user_${rawId}@gmail.com`;
    const password = 'test1234';
    const name = `테스트 도반 ${i}`;

    console.log(`\n[User ${i}] 계정 확인 및 생성 중: ${name} (${rawId})`);

    // 계정 생성
    let { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, email, requiresPasswordChange: false }
    });

    if (createError) {
      if (createError.message.includes('already registered')) {
        console.log(`[User ${i}] 이미 존재하는 계정입니다. ID를 가져옵니다.`);
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existing = listData.users.find(u => u.email === email);
        if (existing) {
          userData = { user: existing };
        } else {
          console.error(`[User ${i}] 계정 찾기 실패`);
          continue;
        }
      } else {
        console.error(`[User ${i}] 계정 생성 중 오류:`, createError);
        continue;
      }
    }
    
    const userId = userData.user.id;

    // 2. 사용자의 기존 설정 및 로그 삭제 (초기화)
    await supabase.from('daily_practice_logs').delete().eq('user_id', userId);
    await supabase.from('user_practice_settings').delete().eq('user_id', userId);
    await supabase.from('practice_items').delete().eq('created_by', userId);

    // 3. 사용자별 추가 실천사항 생성 (0~3개)
    const customItemCount = generateRandomInt(0, 3);
    const customItems = [];
    for (let j = 1; j <= customItemCount; j++) {
      const { data: newItem, error: insertError } = await supabase
        .from('practice_items')
        .insert({
          name: `${name}의 개인 수련 ${j}`,
          description: `1회 ${0.5 * j}빛`,
          light_per_unit: 0.5 * j,
          is_default: false,
          created_by: userId
        })
        .select('*')
        .single();
      if (!insertError && newItem) {
        customItems.push(newItem);
      }
    }
    console.log(`[User ${i}] 개인 실천과제 ${customItems.length}개 생성 완료`);

    // 4. 사용자별 기본 실천사항 선택 (3~6개)
    const defaultItemCount = generateRandomInt(3, 6);
    // 무작위로 섞어서 앞의 defaultItemCount 만큼 선택
    const shuffledDefaults = [...defaultItems].sort(() => 0.5 - Math.random());
    const selectedDefaults = shuffledDefaults.slice(0, defaultItemCount);
    
    const allSelectedItems = [...selectedDefaults, ...customItems];
    
    const settingInserts = allSelectedItems.map(item => ({
      user_id: userId,
      practice_item_id: item.id,
      is_active: true
    }));

    await supabase.from('user_practice_settings').insert(settingInserts);
    console.log(`[User ${i}] 기본 ${selectedDefaults.length}개 + 개인 ${customItems.length}개 설정 완료`);

    // 5. 1주~2주(7~14일) 간 무작위로 실천 기록 등록
    const daysLog = generateRandomInt(7, 14);
    const logInserts = [];

    for (let d = 0; d < daysLog; d++) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - d); // 오늘부터 d일 전
      const dateStr = date.toISOString().split('T')[0];

      // 해당 날짜에 몇 개의 과제를 실천했는지 무작위 (1개 ~ 설정한 항목 수)
      const tasksPerDay = generateRandomInt(1, allSelectedItems.length);
      const shuffledTasks = [...allSelectedItems].sort(() => 0.5 - Math.random());
      const tasksToLog = shuffledTasks.slice(0, tasksPerDay);

      tasksToLog.forEach(task => {
        const count = generateRandomInt(1, 10); // 1~10회
        const light = count * task.light_per_unit;

        logInserts.push({
          user_id: userId,
          practice_item_id: task.id,
          date: dateStr,
          count: count,
          light: parseFloat(light.toFixed(1))
        });
      });
    }

    if (logInserts.length > 0) {
      const chunked = [];
      for (let i = 0; i < logInserts.length; i += 100) {
        chunked.push(logInserts.slice(i, i + 100));
      }
      for (const chunk of chunked) {
        await supabase.from('daily_practice_logs').insert(chunk);
      }
      console.log(`[User ${i}] 최근 ${daysLog}일간 총 ${logInserts.length}건의 실천 기록 등록됨`);
    }
  }

  console.log('\n--- 모든 테스트 데이터 생성이 완료되었습니다 ---');
}

main().catch(console.error);
