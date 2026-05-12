import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { message: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Supabase client with user's auth context to verify identity
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { message: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Use service role to delete the user from auth
    const admin = getSupabaseAdmin();

    // Delete from public.users first (optional, cascade should handle it, but being explicit)
    const { error: dbError } = await admin
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      console.error('Delete user from public.users error:', dbError);
      // Continue anyway - auth deletion is the primary goal
    }

    // Delete the user from Supabase Auth
    const { error: authError } = await admin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Delete auth user error:', authError);
      return NextResponse.json(
        { message: '회원탈퇴 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '회원탈퇴가 완료되었습니다.' });
  } catch (error: any) {
    console.error('Withdraw error:', error);
    return NextResponse.json(
      { message: '회원탈퇴 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
