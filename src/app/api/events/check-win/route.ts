import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * POST /api/events/check-win
 * 실천 저장 후 이벤트 당첨 여부 확인 및 당첨자 등록
 * body: { totalLight, userName }
 * 반환: { newWins: Event[] }  — 이번 저장으로 새로 달성한 이벤트 목록
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
  const { totalLight, userName } = body;
  if (totalLight === undefined) {
    return NextResponse.json({ message: 'totalLight가 필요합니다.' }, { status: 400 });
  }

  const admin = getSupabaseAdminAny();

  // 활성 이벤트 중 아직 당첨자가 없는(winner_user_id IS NULL) 이벤트만 대상
  // → 사용자의 누적 빛이 threshold 이상인 경우 당첨 처리
  const { data: events, error: fetchError } = await admin
    .from('events')
    .select('*')
    .eq('is_active', true)
    .is('winner_user_id', null)
    .lte('light_threshold', parseFloat(totalLight));

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
        achieved_light: parseFloat(totalLight),
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
