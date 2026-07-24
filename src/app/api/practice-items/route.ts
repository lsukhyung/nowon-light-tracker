import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminAny, createSupabaseClientWithAuth } from '@/lib/supabase';
import { requireUser } from '@/lib/route-auth';
import { mapPracticeItemRow, validatePracticeItemInput } from '@/lib/practice-items';

/**
 * GET /api/practice-items
 * 기본 실천과제 + 본인이 만든 추가과제 목록 반환
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user } = auth;

  const admin = getSupabaseAdminAny();
  const { data, error } = await admin
    .from('practice_items')
    .select('*')
    .or(`is_default.eq.true,created_by.eq.${user.id}`)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('practice_items GET error:', error);
    return NextResponse.json({ message: '실천과제를 불러오는데 실패했습니다.' }, { status: 500 });
  }

  // snake_case → camelCase
  const items = (data || []).map((item: any) => mapPracticeItemRow(item));

  return NextResponse.json(items);
}

/**
 * POST /api/practice-items
 * 추가 실천과제 생성
 * body: { name, description, lightPerUnit }
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user, token } = auth;

  const body = await request.json();
  const parsed = validatePracticeItemInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { name, description, lightVal } = parsed;

  const authSupabase = createSupabaseClientWithAuth(token);
  const { data, error } = await authSupabase
    .from('practice_items')
    .insert({
      name,
      description,
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

  // 생성된 과제를 자동으로 선택 상태로 등록
  const admin = getSupabaseAdminAny();
  const { error: settingsError } = await admin
    .from('user_practice_settings')
    .upsert({ user_id: user.id, practice_item_id: data.id, is_active: true }, { onConflict: 'user_id,practice_item_id' });

  if (settingsError) {
    console.error('실천과제 자동 선택 등록 실패:', settingsError);
  }

  return NextResponse.json(mapPracticeItemRow(data), { status: 201 });
}

/**
 * PUT /api/practice-items?id=xxx
 * 본인이 만든 추가과제 수정
 * body: { name, description?, lightPerUnit }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user, token } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });

  const body = await request.json();
  const parsed = validatePracticeItemInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { name, description, lightVal } = parsed;

  const authSupabase = createSupabaseClientWithAuth(token);
  const { data, error } = await authSupabase
    .from('practice_items')
    .update({
      name,
      description,
      light_per_unit: lightVal,
    })
    .eq('id', id)
    .eq('created_by', user.id)
    .eq('is_default', false)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    console.error('practice_items PUT error:', error);
    return NextResponse.json({ message: '수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(mapPracticeItemRow(data));
}

/**
 * DELETE /api/practice-items?id=xxx
 * 본인이 만든 추가과제 삭제
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireUser(request);
  if (auth instanceof NextResponse) return auth;
  const { user, token } = auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });

  const authSupabase = createSupabaseClientWithAuth(token);

  // 실천과제를 소프트 삭제(deleted_at 표시)한다.
  // 행을 물리 삭제하지 않기 때문에 daily_practice_logs 의 과제 참조가 그대로 유지되어
  // 기존 실천 내역은 사라지지 않는다.
  // 단, 사용자의 활성 선택(user_practice_settings)에서는 제외되어야
  // 삭제된 과제가 오늘의 체크리스트에 더 이상 노출되지 않는다.
  await authSupabase
    .from('user_practice_settings')
    .delete()
    .eq('practice_item_id', id)
    .eq('user_id', user.id);

  const { error } = await authSupabase
    .from('practice_items')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('created_by', user.id)
    .eq('is_default', false)
    .is('deleted_at', null);

  if (error) {
    console.error('practice_items DELETE error:', error);
    return NextResponse.json({ message: '삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ message: '삭제되었습니다.' });
}
