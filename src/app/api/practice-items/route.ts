import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdminAny, createSupabaseClientWithAuth } from '@/lib/supabase';

async function getUserFromToken(token: string) {
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

/**
 * GET /api/practice-items
 * 기본 실천과제 + 본인이 만든 추가과제 목록 반환
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
    .from('practice_items')
    .select('*')
    .or(`is_default.eq.true,created_by.eq.${user.id}`)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('practice_items GET error:', error);
    return NextResponse.json({ message: '실천과제를 불러오는데 실패했습니다.' }, { status: 500 });
  }

  // snake_case → camelCase
  const items = (data || []).map((item: any) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    lightPerUnit: item.light_per_unit,
    isDefault: item.is_default,
    createdBy: item.created_by,
    createdAt: item.created_at,
  }));

  return NextResponse.json(items);
}

/**
 * POST /api/practice-items
 * 추가 실천과제 생성
 * body: { name, description, lightPerUnit }
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
  const { name, description, lightPerUnit } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ message: '과제명은 필수입니다.' }, { status: 400 });
  }
  const lightVal = parseFloat(lightPerUnit);
  if (isNaN(lightVal) || lightVal <= 0) {
    return NextResponse.json({ message: '빛은 0보다 큰 숫자여야 합니다.' }, { status: 400 });
  }

  const authSupabase = createSupabaseClientWithAuth(token);
  const { data, error } = await authSupabase
    .from('practice_items')
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      light_per_unit: lightVal,
      is_default: false,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('practice_items POST error:', error);
    return NextResponse.json({ message: '실천과제 생성에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    description: data.description,
    lightPerUnit: data.light_per_unit,
    isDefault: data.is_default,
    createdBy: data.created_by,
    createdAt: data.created_at,
  }, { status: 201 });
}

/**
 * DELETE /api/practice-items?id=xxx
 * 본인이 만든 추가과제 삭제
 */
export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ message: '인증이 필요합니다.' }, { status: 401 });
  }
  const token = authHeader.substring(7);
  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ message: '유효하지 않은 토큰입니다.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });

  const authSupabase = createSupabaseClientWithAuth(token);
  
  // 실천과제와 연관된 사용자 설정 및 기록들도 함께 삭제 (ON DELETE CASCADE가 없을 경우를 대비)
  await authSupabase.from('user_practice_settings').delete().eq('practice_item_id', id);
  await authSupabase.from('daily_practice_logs').delete().eq('practice_item_id', id);

  const { error } = await authSupabase
    .from('practice_items')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id)
    .eq('is_default', false);

  if (error) {
    console.error('practice_items DELETE error:', error);
    return NextResponse.json({ message: '삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ message: '삭제되었습니다.' });
}
