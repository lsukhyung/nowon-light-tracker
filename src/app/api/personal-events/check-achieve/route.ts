import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminAny } from '@/lib/supabase';
import { requireUser } from '@/lib/route-auth';
import { todayKST } from '@/lib/utils';

/**
 * POST /api/personal-events/check-achieve
 * 실천 저장 후 개인 이벤트 달성 여부 확인 및 달성 처리
 * body: { date? }  — date(YYYY-MM-DD) 생략 시 오늘(KST)
 * 반환: { newAchievements: PersonalEvent[] }
 *
 * - is_active = true && achieved_at IS NULL 인 이벤트만 대상
 * - light_threshold <= (사용자 누적 빛 my_total_light) 인 경우 달성 처리
 * - 동시성 보호: achieved_at IS NULL 조건으로 업데이트
 * 누적 빛은 서버가 get_light_sums RPC 로 직접 계산한다(stale 클라이언트 값 오류 방지).
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await request.json().catch(() => ({}));
  const { date } = body || {};
  const pDate = typeof date === 'string' && date ? date : todayKST();

  const admin = getSupabaseAdminAny();

  const { data: sums, error: sumsError } = await admin
    .rpc('get_light_sums', { p_user_id: user.id, p_date: pDate });
  if (sumsError) {
    console.error('personal-events check-achieve get_light_sums error:', sumsError);
    return NextResponse.json({ message: '조회에 실패했습니다.' }, { status: 500 });
  }
  const row = Array.isArray(sums) ? sums[0] : sums;
  const totalLight = Number(row?.my_total_light || 0);

  // 활성 + 미달성 + 임계값 이하인 개인 이벤트 조회
  const { data: events, error: fetchError } = await admin
    .from('personal_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .is('achieved_at', null)
    .lte('light_threshold', totalLight);

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
        achieved_light: totalLight,
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
