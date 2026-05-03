import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * POST /api/personal-events/check-achieve
 * 실천 저장 후 개인 이벤트 달성 여부 확인 및 달성 처리
 * body: { totalLight }
 * 반환: { newAchievements: PersonalEvent[] }
 *
 * 기존 /api/events/check-win과 동일한 패턴:
 * - is_active = true && achieved_at IS NULL 인 이벤트만 대상
 * - light_threshold <= totalLight 인 경우 달성 처리
 * - 동시성 보호: achieved_at IS NULL 조건으로 업데이트
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  const body = await request.json();
  const { totalLight } = body;
  if (totalLight === undefined) {
    return NextResponse.json({ message: 'totalLight가 필요합니다.' }, { status: 400 });
  }

  const admin = getSupabaseAdminAny();

  // 활성 + 미달성 + 임계값 이하인 개인 이벤트 조회
  const { data: events, error: fetchError } = await admin
    .from('personal_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('achieved_at', null)
    .lte('light_threshold', parseFloat(totalLight));

  if (fetchError) {
    console.error('personal-events check-achieve fetch error:', fetchError);
    return NextResponse.json({ message: '조회에 실패했습니다.' }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ newAchievements: [] });
  }

  const newAchievements: any[] = [];

  for (const event of events) {
    const { data: updated, error: updateError } = await admin
      .from('personal_events')
      .update({
        achieved_light: parseFloat(totalLight),
        achieved_at: new Date().toISOString(),
      })
      .eq('id', event.id)
      .is('achieved_at', null)
      .select()
      .single();

    if (!updateError && updated) {
      newAchievements.push({
        id: updated.id,
        userId: updated.user_id,
        userName: updated.user_name ?? null,
        name: updated.name,
        lightThreshold: updated.light_threshold,
        bouquetImageUrl: updated.bouquet_image_url,
        achievedLight: updated.achieved_light,
        achievedAt: updated.achieved_at,
      });
    }
  }

  return NextResponse.json({ newAchievements });
}
