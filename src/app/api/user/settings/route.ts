import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * GET /api/user/settings
 * 사용자 과제 선택 목록 + 목표 조회
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  const admin = getSupabaseAdminAny();

  // 사용자 과제 선택 설정
  const { data: settings, error: settingsError } = await admin
    .from('user_practice_settings')
    .select(`
      id,
      user_id,
      practice_item_id,
      is_active,
      practice_items (
        id, name, description, light_per_unit, is_default, created_by, created_at
      )
    `)
    .eq('user_id', user.id);

  if (settingsError) {
    console.error('user_practice_settings GET error:', settingsError);
    return NextResponse.json({ message: '설정을 불러오는데 실패했습니다.' }, { status: 500 });
  }

  // 사용자 목표 조회
  const { data: goal } = await admin
    .from('user_goals')
    .select('*')
    .eq('user_id', user.id)
    .single();

  const mappedSettings = (settings || []).map((s: any) => ({
    id: s.id,
    userId: s.user_id,
    practiceItemId: s.practice_item_id,
    isActive: s.is_active,
    practiceItem: s.practice_items ? {
      id: s.practice_items.id,
      name: s.practice_items.name,
      description: s.practice_items.description,
      lightPerUnit: s.practice_items.light_per_unit,
      isDefault: s.practice_items.is_default,
      createdBy: s.practice_items.created_by,
      createdAt: s.practice_items.created_at,
    } : null,
  }));

  return NextResponse.json({
    settings: mappedSettings,
    goal: goal ? {
      id: goal.id,
      userId: goal.user_id,
      dailyLightGoal: goal.daily_light_goal,
      totalLightGoal: goal.total_light_goal,
    } : null,
  });
}

/**
 * PUT /api/user/settings
 * 사용자 과제 선택/해제 + 목표 저장
 * body: {
 *   practiceItemIds: string[],   // 선택된 과제 ID 배열
 *   dailyLightGoal: number,
 *   totalLightGoal: number
 * }
 */
export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  const body = await request.json();
  const { practiceItemIds, dailyLightGoal, totalLightGoal } = body;

  const admin = getSupabaseAdminAny();

  // 1. 기존 설정 모두 가져오기
  const { data: existing } = await admin
    .from('user_practice_settings')
    .select('practice_item_id')
    .eq('user_id', user.id);

  const existingIds = new Set((existing || []).map((s: any) => s.practice_item_id));
  const selectedIds = new Set(practiceItemIds || []);

  // 2. 새로 추가할 항목 upsert
  if (practiceItemIds && practiceItemIds.length > 0) {
    const toUpsert = practiceItemIds.map((id: string) => ({
      user_id: user.id,
      practice_item_id: id,
      is_active: true,
    }));
    const { error: upsertError } = await admin
      .from('user_practice_settings')
      .upsert(toUpsert, { onConflict: 'user_id,practice_item_id' });
    if (upsertError) {
      console.error('settings upsert error:', upsertError);
      return NextResponse.json({ message: '설정 저장에 실패했습니다.' }, { status: 500 });
    }
  }

  // 3. 선택 해제된 항목 비활성화
  const toDeactivate = [...existingIds].filter(id => !selectedIds.has(id));
  if (toDeactivate.length > 0) {
    await admin
      .from('user_practice_settings')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .in('practice_item_id', toDeactivate);
  }

  // 4. 목표 저장 (upsert)
  if (dailyLightGoal !== undefined && totalLightGoal !== undefined) {
    const { error: goalError } = await admin
      .from('user_goals')
      .upsert({
        user_id: user.id,
        daily_light_goal: parseFloat(dailyLightGoal) || 0,
        total_light_goal: parseFloat(totalLightGoal) || 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (goalError) {
      console.error('user_goals upsert error:', goalError);
      return NextResponse.json({ message: '목표 저장에 실패했습니다.' }, { status: 500 });
    }
  }

  return NextResponse.json({ message: '설정이 저장되었습니다.' });
}
