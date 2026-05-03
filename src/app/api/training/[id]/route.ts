import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES, createSupabaseClientWithAuth } from '@/lib/supabase';

// 토큰에서 사용자 ID 추출
async function getUserIdFromToken(token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

// RLS를 위해 인증된 클라이언트 생성
function getAuthenticatedClient(token: string) {
  return createSupabaseClientWithAuth(token);
}

// PUT /api/training/[id] - 기록 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = await getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // RLS를 위해 인증된 클라이언트 사용
    const authSupabase = getAuthenticatedClient(token);

    const body = await request.json();
    
    // 업데이트할 필드만 추출 (메타데이터 필드 및 date 필드 제외)
    const {
      id: _id,
      date: _date, // date는 변경 불가
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      userId: _userId,
      created_at: _created_at,
      updated_at: _updated_at,
      user_id: _user_id,
      ...updateFields
    } = body;

    // 실제 수련 데이터 필드만 업데이트
    const updates = {
      ...updateFields,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await authSupabase
      .from(TABLES.TRAINING_RECORDS)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      console.error('Update data:', updates);
      console.error('Record ID:', id);
      return NextResponse.json(
        { 
          message: '기록 수정에 실패했습니다.',
          error: error.message || 'Unknown error',
          details: error.details || null
        },
        { status: 500 }
      );
    }

    if (!updated) {
      return NextResponse.json(
        { message: '기록을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // Convert snake_case to camelCase for frontend
    const camelCaseRecord = {
      ...updated,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      userId: updated.user_id,
    };

    return NextResponse.json(camelCaseRecord);
  } catch (error: any) {
    console.error('Update training record error:', error);
    return NextResponse.json(
      { message: '기록 수정에 실패했습니다.' },
      { status: 500 }
    );
  }
}

// DELETE /api/training/[id] - 기록 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const userId = await getUserIdFromToken(token);

    if (!userId) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // RLS를 위해 인증된 클라이언트 사용
    const authSupabase = getAuthenticatedClient(token);

    const { error } = await authSupabase
      .from(TABLES.TRAINING_RECORDS)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { message: '기록 삭제에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '기록이 삭제되었습니다.' });
  } catch (error: any) {
    console.error('Delete training record error:', error);
    return NextResponse.json(
      { message: '기록 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
