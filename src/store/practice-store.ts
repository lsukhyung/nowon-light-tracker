import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { api } from '@/lib/api';
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
  fetchTotalLight: () => Promise<void>;
  setSelectedDate: (date: string) => void;

  /** 단건 횟수 변경 (즉시 서버 저장) */
  updateCount: (practiceItemId: string, count: number, lightPerUnit: number) => Promise<void>;

  /** 일괄 저장 */
  saveBatch: () => Promise<void>;

  /** 추가 실천과제 생성 */
  createPracticeItem: (item: { name: string; description?: string; lightPerUnit: number }) => Promise<void>;

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

      fetchTotalLight: async () => {
        try {
          const data = await api.getTotalLight();
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
          const newLight = parseFloat((Math.max(0, count) * lightPerUnit).toFixed(2));
          if (existing) {
            return {
              todayLogs: state.todayLogs.map(l =>
                l.practiceItemId === practiceItemId
                  ? { ...l, count: Math.max(0, count), light: newLight }
                  : l
              ),
            };
          } else {
            const newLog: DailyPracticeLog = {
              id: `temp-${practiceItemId}`,
              userId: '',
              practiceItemId,
              date,
              count: Math.max(0, count),
              light: newLight,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
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
          // 저장 후 서버에서 재조회
          await get().fetchLogsForDate(selectedDate);
          await get().fetchTotalLight();
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
        await get().fetchUserSettings();
        return created;
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
