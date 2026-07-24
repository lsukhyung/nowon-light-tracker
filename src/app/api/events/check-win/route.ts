import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminAny } from '@/lib/supabase';
import { requireUser } from '@/lib/route-auth';
import { todayKST } from '@/lib/utils';

/**
 * POST /api/events/check-win
 * 실천 저장 후 이벤트 당첨 여부 확인 및 당첨자 등록
 * body: { userName?, date? }  — date(YYYY-MM-DD) 생략 시 오늘(KST)
 * 반환: { newWins: Event[] }  — 이번 저장으로 새로 달성한 이벤트 목록
 *
 * 누적 빛은 클라이언트가 보내지 않고 서버가 get_light_sums RPC 로 직접 계산한다.
 * 클라이언트 값이 stale/오차로 이벤트를 잘못 당첨하거나 누락하는 치명적 사고를 막기 위함.
 * (이벤트 기준은 노원지원 전체 누적 빛 all_time_total_light.)
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const body = await request.json().catch(() => ({}));
  const { userName, date } = body || {};
  const pDate = typeof date === 'string' && date ? date : todayKST();

  const admin = getSupabaseAdminAny();

  const { data: sums, error: sumsError } = await admin
    .rpc('get_light_sums', { p_user_id: user.id, p_date: pDate });
  if (sumsError) {
    console.error('events check-win get_light_sums error:', sumsError);
    return NextResponse.json({ message: '조회에 실패했습니다.' }, { status: 500 });
  }
  const row = Array.isArray(sums) ? sums[0] : sums;
  const totalLight = Number(row?.all_time_total_light || 0);

  // 활성 이벤트 중 아직 당첨자가 없는(winner_user_id IS NULL) 이벤트만 대상
  // → 전체 누적 빛이 threshold 이상인 경우 당첨 처리
  const { data: events, error: fetchError } = await admin
    .from('events')
    .select('*')
    .eq('is_active', true)
    .is('winner_user_id', null)
    .lte('light_threshold', totalLight);

  if (fetchError) {
    console.error('events check-win fetch error:', fetchError);
    return NextResponse.json({ message: '조회에 실패했습니다.' }, { status: 500 });
  }

  if (!events || events.length === 0) {
    return NextResponse.json({ newWins: [] });
  }

  const newWins: any[] = [];

  for (const event of events) {
    const { data: updated, error: updateError } = await admin
      .from('events')
      .update({
        winner_user_id: user.id,
        winner_user_name: userName || user.email,
        achieved_light: totalLight,
        won_at: new Date().toISOString(),
      })
      // 동시성 보호: winner_user_id가 아직 null인 경우만 업데이트
      .eq('id', event.id)
      .is('winner_user_id', null)
      .select()
      .single();

    if (!updateError && updated) {
      newWins.push({
        id: updated.id,
        name: updated.name,
        lightThreshold: updated.light_threshold,
        winnerUserName: updated.winner_user_name,
        achievedLight: updated.achieved_light,
        wonAt: updated.won_at,
      });
    }
  }

  return NextResponse.json({ newWins });
}
