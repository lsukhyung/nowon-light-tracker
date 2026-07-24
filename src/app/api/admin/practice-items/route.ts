import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminAny } from '@/lib/supabase';
import { requireAdmin } from '@/lib/route-auth';
import { mapPracticeItemRow, validatePracticeItemInput } from '@/lib/practice-items';

/**
 * GET /api/admin/practice-items
 * 기본 실천과제 전체 목록 (삭제되지 않은 것만)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const admin = getSupabaseAdminAny();
  const { data, error } = await admin
    .from('practice_items')
    .select('*')
    .eq('is_default', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('admin practice-items GET error:', error);
    return NextResponse.json({ message: '조회에 실패했습니다.' }, { status: 500 });
  }

  const items = (data || []).map((item: any) => mapPracticeItemRow(item));

  return NextResponse.json(items);
}

/**
 * PUT /api/admin/practice-items?id=xxx
 * 기본 실천과제 수정 (관리자 전용)
 * body: { name, description?, lightPerUnit }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ message: 'id가 필요합니다.' }, { status: 400 });

  const body = await request.json();
  const parsed = validatePracticeItemInput(body);
  if ('error' in parsed) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { name, description, lightVal } = parsed;

  const admin = getSupabaseAdminAny();
  const { data, error } = await admin
    .from('practice_items')
    .update({
      name,
      description,
      light_per_unit: lightVal,
    })
    .eq('id', id)
    .eq('is_default', true)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    console.error('admin practice-items PUT error:', error);
    return NextResponse.json({ message: '수정에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json(mapPracticeItemRow(data));
}
