import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny } from '@/lib/supabase';
import { checkAdminPermission } from '@/lib/admin';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function mapEvent(e: any) {
  return {
    id: e.id,
    name: e.name,
    lightThreshold: e.light_threshold,
    isActive: e.is_active,
    createdAt: e.created_at,
    winnerUserId: e.winner_user_id ?? null,
    winnerUserName: e.winner_user_name ?? null,
    achievedLight: e.achieved_light ?? null,
    wonAt: e.won_at ?? null,
  };
}

/**
 * GET /api/events
 * 활성 이벤트 목록 조회 (인증 필요)
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
  const { data, error } = await admin
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('events GET error:', error);
    return NextResponse.json({ message: '조회에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json((data || []).map(mapEvent));
}

/**
 * POST /api/events
 * 이벤트 생성 (관리자만)
 * body: { name, lightThreshold }
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  if (!checkAdminPermission(user.email)) {
    return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const body = await request.json();
  const { name, lightThreshold } = body;
  if (!name || lightThreshold === undefined) {
    return NextResponse.json({ message: '이름과 빛 수는 필수입니다.' }, { status: 400 });
  }

  const admin = getSupabaseAdminAny();
  const { data, error } = await admin
    .from('events')
    .insert({ name, light_threshold: parseFloat(lightThreshold) })
    .select()
    .single();

  if (error) {
    console.error('events POST error:', error);
    return NextResponse.json({ message: '등록에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(mapEvent(data), { status: 201 });
}

/**
 * DELETE /api/events?id=xxx
 * 이벤트 삭제 (관리자만)
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  if (!checkAdminPermission(user.email)) {
    return NextResponse.json({ message: '관리자 권한이 필요합니다.' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });

  const admin = getSupabaseAdminAny();
  const { error } = await admin.from('events').delete().eq('id', id);

  if (error) {
    console.error('events DELETE error:', error);
    return NextResponse.json({ message: '삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ message: '삭제되었습니다.' });
}
