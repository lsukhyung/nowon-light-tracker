/**
 * 관리자 권한 체크 유틸리티
 * 보안: 서버 사이드에서만 사용하며, 클라이언트는 API를 통해 확인
 */

// 환경 변수에서 관리자 이메일 목록 가져오기 (서버 사이드 전용)
// 보안을 위해 NEXT_PUBLIC_ 접두사 사용하지 않음
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim())
  .filter(email => email.length > 0);

/**
 * 이메일이 관리자인지 확인 (서버 사이드 전용)
 * 클라이언트에서는 사용하지 않음 - API를 통해 확인해야 함
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  
  // 환경 변수에 설정된 관리자 이메일 확인
  if (ADMIN_EMAILS.length > 0) {
    return ADMIN_EMAILS.includes(email);
  }
  
  return false;
}

/**
 * 관리자 권한 확인 (API 라우트에서 사용)
 */
export function checkAdminPermission(userEmail: string | null | undefined): boolean {
  return isAdminEmail(userEmail);
}
