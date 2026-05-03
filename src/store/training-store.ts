import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
import { TrainingRecord, Grade } from '@/types/training';
import { api } from '@/lib/api';

interface TrainingStore {
  records: TrainingRecord[];
  currentRecord: Partial<TrainingRecord> | null;
  selectedDate: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRecords: () => Promise<void>;
  setRecords: (records: TrainingRecord[]) => void;
  addRecord: (record: TrainingRecord) => Promise<void>;
  updateRecord: (id: string, updates: Partial<TrainingRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  setCurrentRecord: (record: Partial<TrainingRecord> | null) => void;
  setSelectedDate: (date: string) => Promise<void>;
  getRecordByDate: (date: string) => TrainingRecord | undefined;
  clearCurrentRecord: () => void;
}

// UUID 생성 함수 (crypto.randomUUID 대체)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const createEmptyRecord = (date: string): Partial<TrainingRecord> => ({
  id: generateId(),
  date,
  체조: false,
  행공: 0,
  본수련: 0,
  회건술: false,
  석문도서봉독: false,
  운광복습: 0,
  삼주축광: 0,
  내면공간: 0,
  마음과마음가짐수련: 0,
  회광반조: 'C' as Grade,
  성찰탐구: 'C' as Grade,
});

export const useTrainingStore = create<TrainingStore>()(
  persist(
    (set, get) => ({
      records: [],
      currentRecord: null,
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      isLoading: false,
      error: null,

      fetchRecords: async () => {
        set({ isLoading: true, error: null });
        try {
          const records = await api.getTrainingRecords();
          set({ records, isLoading: false });
        } catch (error: any) {
          set({ error: error.message || '기록을 불러오는데 실패했습니다.', isLoading: false });
        }
      },

      setRecords: (records) => set({ records }),

      addRecord: async (record) => {
        set({ isLoading: true, error: null });
        try {
          const created = await api.createTrainingRecord(record);
          set((state) => ({
            records: [...state.records, created].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            ),
            // 저장 성공 후 currentRecord를 업데이트하여 다음 저장 시 수정(PUT)으로 동작하도록
            currentRecord: state.currentRecord?.date === created.date ? created : state.currentRecord,
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message || '기록 저장에 실패했습니다.', isLoading: false });
          throw error;
        }
      },

      updateRecord: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await api.updateTrainingRecord(id, updates);
          set((state) => ({
            records: state.records.map((r) => (r.id === id ? updated : r)),
            // 수정 성공 후 currentRecord도 업데이트
            currentRecord: state.currentRecord?.id === id ? updated : state.currentRecord,
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message || '기록 수정에 실패했습니다.', isLoading: false });
          throw error;
        }
      },

      deleteRecord: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await api.deleteTrainingRecord(id);
          set((state) => ({
            records: state.records.filter((r) => r.id !== id),
            isLoading: false,
          }));
        } catch (error: any) {
          set({ error: error.message || '기록 삭제에 실패했습니다.', isLoading: false });
          throw error;
        }
      },

      setCurrentRecord: (record) => set({ currentRecord: record }),

      setSelectedDate: async (date) => {
        set({ selectedDate: date });
        try {
          const existing = await api.getTrainingRecordByDate(date);
          set({ currentRecord: existing });
        } catch (error: any) {
          // 404 에러는 기록이 없는 것으로 간주하고 빈 레코드 생성
          // 다른 에러는 무시하고 빈 레코드로 시작
          if (error.response?.status === 404 || error.response?.status === undefined) {
            set({ currentRecord: createEmptyRecord(date) });
          } else {
            // 다른 에러는 콘솔에만 기록
            console.error('Failed to fetch record by date:', error);
            set({ currentRecord: createEmptyRecord(date) });
          }
        }
      },

      getRecordByDate: (date) => {
        return get().records.find((r) => r.date === date);
      },

      clearCurrentRecord: () => set({ currentRecord: null }),
    }),
    {
      name: 'training-storage',
      partialize: (state) => ({
        selectedDate: state.selectedDate,
      }),
    }
  )
);
