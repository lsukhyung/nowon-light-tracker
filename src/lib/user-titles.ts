// src/lib/user-titles.ts

/**
 * 사용자 이름별 호칭 매핑
 * 이 객체에 '이름': '호칭' 형식으로 자유롭게 추가하시면 됩니다.
 * 매핑되지 않은 이름은 기본적으로 '도반'으로 표시됩니다.
 */
export const USER_TITLES: Record<string, string> = {
  // 지원장
  '덕산': '지원장',

  // 현사
  '이주열': '현사',
  '하호경': '현사',
  '정덕순': '현사',
  '류연항': '현사',
  '윤미영': '현사',
  '이경근': '현사',
  '류샛별': '현사',
  '김영숙': '현사',
  '김명희': '현사',
  '중현': '현사',

  // 생활지로사
  '신정숙': '생활지로사',

};

/**
 * 이름 기반으로 사용자의 호칭을 반환합니다.
 * @param name 사용자 이름
 * @returns 매핑된 호칭 또는 기본값 '도반'
 */
export function getUserTitle(name: string | null | undefined): string {
  if (!name) return '도반';
  
  // 이름 좌우 공백 제거 후 비교
  const cleanName = name.trim();

  // 매핑된 호칭이 있으면 해당 호칭을, 없으면 '도반'을 반환합니다.
  return USER_TITLES[cleanName] || '도반';
}
