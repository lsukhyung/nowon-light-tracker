import { NextRequest, NextResponse } from 'next/server';
import { supabase, TABLES } from '@/lib/supabase';

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

// GET /api/training/stats - 통계 조회
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';

    // Supabase 쿼리 빌드
    let query = supabase
      .from(TABLES.TRAINING_RECORDS)
      .select('*')
      .eq('user_id', userId);

    const now = new Date();
    const kstNowStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
    const kstNow = new Date(kstNowStr);

    if (period === 'week') {
      const weekAgo = new Date(kstNow.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(weekAgo);
      query = query.gte('date', weekAgoStr);
    } else if (period === 'month') {
      const monthAgo = new Date(kstNow.getTime() - 30 * 24 * 60 * 60 * 1000);
      const monthAgoStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(monthAgo);
      query = query.gte('date', monthAgoStr);
    }

    const { data: records, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { message: '통계를 가져오는데 실패했습니다.' },
        { status: 500 }
      );
    }

    const recordList = records || [];

    // 통계 계산
    const stats = {
      totalDays: recordList.length,
      currentStreak: 0, // TODO: 연속 수련 일수 계산
      longestStreak: 0, // TODO: 최장 연속 일수 계산
      period,
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { message: '통계를 가져오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}
