import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import type { PracticeItemInput } from '@/lib/practice-items';
import type {
  PracticeItem,
  UserPracticeSetting,
  DailyPracticeLog,
  UserGoal,
} from '@/types/training';

interface TotalLightInfo {
  myTodayLight: number;
  myTotalLight: number;
  todayTotalLight: number;
  allTimeTotalLight: number;
}

interface PracticeStore {
  // 실천과제 마스터 목록
  practiceItems: PracticeItem[];
  // 사용자가 선택한 과제 설정
  userSettings: UserPracticeSetting[];
  // 오늘(선택 날짜)의 실천 기록
  todayLogs: DailyPracticeLog[];
  // 사용자 목표
  goal: UserGoal | null;
  // 선택된 날짜
  selectedDate: string;
  // 서버에 저장되어 있는 오늘의 빛 (낙관적 업데이트 계산용)
  savedTodayLight: number;
  // 전체 빛 통계
  totalLightInfo: TotalLightInfo | null;

  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPracticeItems: () => Promise<void>;
  fetchUserSettings: () => Promise<void>;
  fetchLogsForDate: (date: string) => Promise<void>;
  fetchTotalLight: (date?: string) => Promise<void>;
  setSelectedDate: (date: string) => void;

  /** 단건 횟수 변경 (즉시 서버 저장) */
  updateCount: (practiceItemId: string, count: number, lightPerUnit: number) => Promise<void>;

  /** 일괄 저장 */
  saveBatch: () => Promise<void>;

  /** 추가 실천과제 생성 */
  createPracticeItem: (item: PracticeItemInput) => Promise<void>;

  /** 추가 실천과제 수정 */
  updatePracticeItem: (id: string, item: PracticeItemInput) => Promise<void>;

  /** 추가 실천과제 삭제 */
  deletePracticeItem: (id: string) => Promise<void>;

  /** 사용자 설정 저장 (과제 선택 + 목표) */
  saveUserSettings: (payload: {
    practiceItemIds: string[];
    dailyLightGoal: number;
    totalLightGoal: number;
  }) => Promise<void>;

  /** 활성화된 과제 목록 (사용자가 선택한 것만) */
  getActivePracticeItems: () => PracticeItem[];

  /** 오늘 특정 과제의 현재 기록 */
  getLogForItem: (practiceItemId: string) => DailyPracticeLog | null;

  /** 오늘 총 빛 */
  getTodayTotalLight: () => number;
}

export const usePracticeStore = create<PracticeStore>()(
  persist(
    (set, get) => ({
      practiceItems: [],
      userSettings: [],
      todayLogs: [],
      goal: null,
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      savedTodayLight: 0,
      totalLightInfo: null,
      isLoading: false,
      error: null,

      fetchPracticeItems: async () => {
        try {
          const items = await api.getPracticeItems();
          set({ practiceItems: items });
        } catch (error: any) {
          set({ error: error.message || '실천과제를 불러오는데 실패했습니다.' });
        }
      },

      fetchUserSettings: async () => {
        try {
          const { settings, goal } = await api.getUserSettings();
          set({ userSettings: settings || [], goal: goal || null });
        } catch (error: any) {
          set({ error: error.message || '설정을 불러오는데 실패했습니다.' });
        }
      },

      fetchLogsForDate: async (date: string) => {
        set({ isLoading: true });
        try {
          const logs = await api.getPracticeLogs(date);
          const savedLight = (logs || []).reduce((sum: number, log: any) => sum + (log.light || 0), 0);
          set({ todayLogs: logs || [], savedTodayLight: savedLight, isLoading: false });
        } catch (error: any) {
          set({ todayLogs: [], savedTodayLight: 0, isLoading: false });
        }
      },

      fetchTotalLight: async (date?: string) => {
        try {
          const data = await api.getTotalLight(date || get().selectedDate);
          set({ totalLightInfo: data });
        } catch (error: any) {
          console.error('fetchTotalLight error:', error);
        }
      },

      setSelectedDate: (date: string) => {
        set({ selectedDate: date });
        get().fetchLogsForDate(date);
      },

      updateCount: async (practiceItemId: string, count: number, lightPerUnit: number) => {
        const date = get().selectedDate;

        // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
        set((state) => {
          const existing = state.todayLogs.find(l => l.practiceItemId === practiceItemId);
          // 이미 저장된 로우면 그 시점의 단위 스냅샷으로, 신규면 현재 과제 단위로 계산한다.
          // 과제 단위가 이후에 바뀌어도 서버는 스냅샷을 유지하므로, 낙관적 표시도 스냅샷을 따라야
          // 저장 전 표시/공유 빛이 persist된 값과 어긋나지 않는다.
          const rate = existing?.lightPerUnit ?? lightPerUnit;
          const newLight = parseFloat((Math.max(0, count) * rate).toFixed(2));
          if (existing) {
            return {
              todayLogs: state.todayLogs.map(l =>
                l.practiceItemId === practiceItemId
                  ? { ...l, count: Math.max(0, count), light: newLight }
                  : l
              ),
            };
          } else {
            // 첫 저장 전 임시 로우. practiceItem 메타데이터가 없으면 PracticeForm 이
            // + 버튼 직후 과제명을 '실천과제'로 렌더링해버리므로, 해당 과제 정보를 붙인다.
            // lightPerUnit(현재 과제 단위)도 스냅샷 자리에 두어 이후 증분이 동일 단위를 쓰게 한다.
            const item = state.practiceItems.find(i => i.id === practiceItemId);
            const newLog: DailyPracticeLog = {
              id: `temp-${practiceItemId}`,
              userId: '',
              practiceItemId,
              date,
              count: Math.max(0, count),
              light: newLight,
              lightPerUnit: lightPerUnit,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              practiceItem: item,
            };
            return { todayLogs: [...state.todayLogs, newLog] };
          }
        });
      },

      saveBatch: async () => {
        const { selectedDate, todayLogs, getActivePracticeItems } = get();
        const activeItems = getActivePracticeItems();

        set({ isLoading: true });
        try {
          const logs = activeItems.map(item => {
            const log = todayLogs.find(l => l.practiceItemId === item.id);
            return {
              practiceItemId: item.id,
              count: log?.count || 0,
              lightPerUnit: item.lightPerUnit,
            };
          });
          await api.savePracticeLogsBatch(selectedDate, logs);
          // 저장 후 서버에서 재조회. 두 갱신은 서로 의존하지 않으므로 병렬로 실행한다.
          await Promise.all([
            get().fetchLogsForDate(selectedDate),
            get().fetchTotalLight(selectedDate),
          ]);
          // 저장 완료되었으므로 로컬 savedTodayLight도 현재 todayLogs 기준으로 업데이트
          set({ savedTodayLight: get().getTodayTotalLight() });
        } catch (error: any) {
          set({ error: error.message || '저장에 실패했습니다.', isLoading: false });
          throw error;
        } finally {
          set({ isLoading: false });
        }
      },

      createPracticeItem: async (item) => {
        const created = await api.createPracticeItem(item);
        set((state) => ({ practiceItems: [...state.practiceItems, created] }));
        // 서버 POST 가 자동 선택(user_practice_settings upsert)을 수행하지만 그 결과를
        // 응답에 반영하지 않고 최선주의로만 처리한다. 로컬 추측이 서버 상태와 어긋나면
        // 새로고침 후 과제가 사라지는 현상이 생기므로, 확정을 위해 설정을 다시 불러온다.
        await get().fetchUserSettings();
        return created;
      },

      updatePracticeItem: async (id, item) => {
        const updated = await api.updatePracticeItem(id, item);
        set((state) => ({
          practiceItems: state.practiceItems.map(i => (i.id === id ? updated : i)),
        }));
        // 1회당 빛은 서버가 로우 단위 스냅샷으로 관리하므로 기존 로그의 light는 변하지 않는다.
        // 따라서 수정 후 로그를 다시 불러올 필요가 없다.
      },

      deletePracticeItem: async (id: string) => {
        await api.deletePracticeItem(id);
        set((state) => ({
          practiceItems: state.practiceItems.filter(i => i.id !== id),
          userSettings: state.userSettings.filter(s => s.practiceItemId !== id),
        }));
      },

      saveUserSettings: async (payload) => {
        await api.updateUserSettings(payload);
        // 저장 후 재조회
        await get().fetchUserSettings();
      },

      getActivePracticeItems: () => {
        const { practiceItems, userSettings } = get();
        const activeIds = new Set(
          userSettings.filter(s => s.isActive).map(s => s.practiceItemId)
        );
        return practiceItems.filter(item => activeIds.has(item.id));
      },

      getLogForItem: (practiceItemId: string) => {
        return get().todayLogs.find(l => l.practiceItemId === practiceItemId) || null;
      },

      getTodayTotalLight: () => {
        return get().todayLogs.reduce((sum, log) => sum + (log.light || 0), 0);
      },
    }),
    {
      name: 'practice-storage',
      partialize: (state) => ({
        goal: state.goal,
      }),
    }
  )
);
