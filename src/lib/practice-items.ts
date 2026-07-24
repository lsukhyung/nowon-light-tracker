// 실천과제 API 라우트 간 공유 검증/매핑 헬퍼.

/** 실천과제 생성/수정 입력 (클라이언트 ↔ 서버 공통 타입). */
export type PracticeItemInput = {
  name: string;
  description?: string;
  lightPerUnit: number;
};

/** practice_items 의 snake_case row 를 클라이언트 camelCase 로 변환. */
export function mapPracticeItemRow(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    lightPerUnit: row.light_per_unit,
    isDefault: row.is_default,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/**
 * 실천과제 입력값 검증. 성공 시 { name, description, lightVal }, 실패 시 { error }.
 * name/description/lightPerUnit({number|string})을 받아 공통 규칙으로 검사한다.
 */
export function validatePracticeItemInput(input: {
  name: unknown;
  description?: unknown;
  lightPerUnit: unknown;
}): { name: string; description: string | null; lightVal: number } | { error: string } {
  const { name, description, lightPerUnit } = input;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return { error: '과제명은 필수입니다.' };
  }
  const lightVal = parseFloat(lightPerUnit as string);
  // light_per_unit 컬럼이 DECIMAL(5,2) 이므로 표현 가능 범위/정밀도로 제한한다.
  // 0.001 처럼 표현 불가능한 값은 PG 가 0.00 으로 반올림 저장하고, 이후 pickRate 가 0을
  // 무효로 보고 1로 fallback 하면서 "0빛으로 표시되는 과제가 1빛을 준다"는 모순이 생긴다.
  if (isNaN(lightVal) || lightVal <= 0) {
    return { error: '빛은 0보다 큰 숫자여야 합니다.' };
  }
  if (lightVal < 0.01 || lightVal > 999.99) {
    return { error: '빛은 0.01 ~ 999.99 사이여야 합니다.' };
  }
  // 소수점 셋째 자리 이하가 있으면 DB 반올림으로 의도치 값이 저장되므로 거부.
  // lightVal.toFixed(2) 로 반올림한 값과 원래 값이 같으면 둘째 자리까지 표현 가능한 것.
  // (Math.round(lightVal*100) 비교는 부동소수 오차로 0.29 같은 정상 값을 걸러버리므로 쓰지 않는다.)
  if (lightVal !== parseFloat(lightVal.toFixed(2))) {
    return { error: '빛은 소수점 둘째 자리까지만 입력할 수 있습니다.' };
  }
  const desc = typeof description === 'string' ? description.trim() : '';
  return { name: name.trim(), description: desc || null, lightVal };
}
