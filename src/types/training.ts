// ============================================================
// 이벤트 타입 정의
// ============================================================

export interface Event {
  id: string;
  name: string;
  lightThreshold: number;    // 달성 기준 빛 수
  isActive: boolean;
  createdAt: string;
  winnerUserId: string | null;
  winnerUserName: string | null;
  achievedLight: number | null;
  wonAt: string | null;
}

// ============================================================
// 빛 모으기 실천과제 시스템 타입 정의
// ============================================================

/** 실천과제 마스터 */
export interface PracticeItem {
  id: string;
  name: string;
  description?: string;       // 실천 기준 설명 (예: "1회 0.5빛", "24분 1빛")
  lightPerUnit: number;       // 1회당 빛
  isDefault: boolean;
  createdBy?: string | null;  // null이면 시스템 기본과제
  createdAt: string;
}

/** 사용자 실천과제 선택 설정 */
export interface UserPracticeSetting {
  id: string;
  userId: string;
  practiceItemId: string;
  isActive: boolean;
  practiceItem?: PracticeItem; // JOIN 포함 시
}

/** 일별 실천 기록 */
export interface DailyPracticeLog {
  id: string;
  userId: string;
  practiceItemId: string;
  date: string;               // YYYY-MM-DD
  count: number;
  light: number;              // count × lightPerUnit
  practiceItem?: PracticeItem;
  createdAt: string;
  updatedAt: string;
}

/** 사용자 목표 */
export interface UserGoal {
  id?: string;
  userId: string;
  dailyLightGoal: number;     // 1일 목표 빛
  totalLightGoal: number;     // 누적 목표 빛
}

/** 일별 통계 집계 */
export interface DailyLightSummary {
  date: string;
  totalLight: number;
}

/** 실천활동별 집계 */
export interface PracticeActivitySummary {
  practiceItemId: string;
  practiceItemName: string;
  description?: string;
  totalCount: number;
  totalLight: number;
}

/** 도반(사용자) 통계 */
export interface UserDailySummary {
  userId: string;
  userName: string;
  totalLight: number;
  dailyLightGoal: number;
  achievementRate: number;    // %
}

// ============================================================
// 기존 타입 (하위 호환성 유지)
// ============================================================
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface TrainingRecord {
  id: string;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  userId?: string;
  createdAt: string;
  updatedAt: string;

  // 수련 항목들
  체조: boolean;
  행공: number; // 횟수
  본수련: number; // 횟수
  회건술: boolean;
  석문도서봉독: boolean;
  행공퍼센트: number; // % (10% 단위)
  운광복습: number; // % (10% 단위)
  삼주축광: number; // % (10% 단위)
  내면공간: number; // % (10% 단위)
  마음과마음가짐수련: number; // 횟수
  나의역사: boolean;
  회광반조: Grade;
  성찰탐구: Grade;

  // 메모 (선택)
  memo?: string;
}

// 수련 항목 메타데이터
export interface TrainingItemMeta {
  key: keyof TrainingRecord;
  label: string;
  type: 'boolean' | 'number' | 'percent' | 'grade';
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

// 통계를 위한 집계 타입
export interface TrainingStats {
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
  itemStats: {
    [key: string]: {
      total: number;
      days: number;
      average: number;
    };
  };
}
