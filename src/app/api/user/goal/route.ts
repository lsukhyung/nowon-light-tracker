import { NextRequest, NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { trainingGoal } = body;

    if (typeof trainingGoal !== 'string') {
      return NextResponse.json(
        { message: '목표는 텍스트여야 합니다.' },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          trainingGoal: trainingGoal.trim(),
        },
      }
    );

    if (updateError) {
      return NextResponse.json(
        { message: updateError.message || '목표 저장에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ trainingGoal: trainingGoal.trim() });
  } catch (error: any) {
    console.error('Update training goal error:', error);
    return NextResponse.json(
      { message: error.message || '목표 저장에 실패했습니다.' },
      { status: 500 }
    );
  }
}
