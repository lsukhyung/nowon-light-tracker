import axios, { AxiosInstance } from 'axios';

// Next.js API routes를 사용하는 경우 baseURL은 빈 문자열 (상대 경로)
// 외부 API를 사용하는 경우 NEXT_PUBLIC_API_URL 환경 변수 설정
const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor: add token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor: handle 401 with token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // 401이고 아직 재시도하지 않았으면 토큰 갱신 시도
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          // refresh 요청 자체가 실패한 경우는 바로 로그아웃
          if (originalRequest.url === '/api/auth/refresh') {
            return Promise.reject(error);
          }

          // 로그인 시도 중 발생한 401 에러는 인터셉터에서 처리하지 않고 그대로 반환
          // (로그인 컴포넌트에서 에러 메시지를 표시할 수 있도록)
          if (originalRequest.url === '/api/auth/login') {
            return Promise.reject(error);
          }

          try {
            // Zustand store에서 refreshToken 가져오기
            const authStorage = localStorage.getItem('auth-storage');
            const parsed = authStorage ? JSON.parse(authStorage) : null;
            const refreshToken = parsed?.state?.refreshToken;

            if (refreshToken) {
              const { data } = await this.client.post('/api/auth/refresh', { refreshToken });

              // 새 토큰 저장
              localStorage.setItem('auth_token', data.token);

              // Zustand store 업데이트
              if (parsed) {
                parsed.state.token = data.token;
                parsed.state.refreshToken = data.refreshToken;
                parsed.state.user = data.user;
                localStorage.setItem('auth-storage', JSON.stringify(parsed));
              }

              // 원래 요청에 새 토큰 적용 후 재시도
              originalRequest.headers.Authorization = `Bearer ${data.token}`;
              return this.client(originalRequest);
            }
          } catch {
            // 갱신 실패 → 로그아웃
          }

          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth-storage');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const { data } = await this.client.post('/api/auth/login', { email, password });
    return data;
  }

  async register(email: string, password: string, name: string) {
    const { data } = await this.client.post('/api/auth/register', { email, password, name });
    return data;
  }

  async logout() {
    const { data } = await this.client.post('/api/auth/logout');
    return data;
  }

  async refreshSession(refreshToken: string) {
    const { data } = await this.client.post('/api/auth/refresh', { refreshToken });
    return data;
  }

  async getCurrentUser() {
    const { data } = await this.client.get('/api/auth/me');
    return data;
  }

  async changePassword(newPassword: string, currentPassword?: string) {
    const { data } = await this.client.post('/api/auth/change-password', {
      newPassword,
      currentPassword,
    });
    return data;
  }

  async withdraw() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const res = await fetch('/api/auth/withdraw', {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    return data;
  }

  async requestPasswordReset(email: string) {
    const { data } = await this.client.post('/api/auth/forgot-password', { email });
    return data;
  }

  async confirmPasswordReset(newPassword: string, token?: string) {
    const { data } = await this.client.post('/api/auth/reset-password/confirm', {
      newPassword,
      token,
    });
    return data;
  }

  // User profile endpoints
  async updateTrainingGoal(trainingGoal: string) {
    const { data } = await this.client.patch('/api/user/goal', { trainingGoal });
    return data;
  }

  // Admin endpoints
  async getUsers() {
    const { data } = await this.client.get('/api/admin/users');
    return data;
  }

  async adminResetPassword(email: string, confirm?: boolean) {
    const { data } = await this.client.post('/api/admin/reset-password', { email, confirm });
    return data;
  }

  // Training records endpoints
  async getTrainingRecords(filters?: { startDate?: string; endDate?: string }) {
    const { data } = await this.client.get('/api/training', { params: filters });
    return data;
  }

  async getTrainingRecord(id: string) {
    const { data } = await this.client.get(`/api/training/${id}`);
    return data;
  }

  async getTrainingRecordByDate(date: string) {
    const { data } = await this.client.get(`/api/training/date/${date}`);
    return data;
  }

  async createTrainingRecord(record: any) {
    const { data } = await this.client.post('/api/training', record);
    return data;
  }

  async updateTrainingRecord(id: string, updates: any) {
    const { data } = await this.client.put(`/api/training/${id}`, updates);
    return data;
  }

  async deleteTrainingRecord(id: string) {
    const { data } = await this.client.delete(`/api/training/${id}`);
    return data;
  }

  // Stats endpoint (legacy)
  async getTrainingStats(period?: 'week' | 'month' | 'all') {
    const { data } = await this.client.get('/api/training/stats', { params: { period } });
    return data;
  }

  // ─── 실천과제 API ────────────────────────────────────────────────
  async getPracticeItems() {
    const { data } = await this.client.get('/api/practice-items');
    return data;
  }

  async createPracticeItem(item: { name: string; description?: string; lightPerUnit: number }) {
    const { data } = await this.client.post('/api/practice-items', item);
    return data;
  }

  async deletePracticeItem(id: string) {
    const { data } = await this.client.delete(`/api/practice-items?id=${id}`);
    return data;
  }

  // ─── 사용자 설정 API ─────────────────────────────────────────────
  async getUserSettings() {
    const { data } = await this.client.get('/api/user/settings');
    return data;
  }

  async updateUserSettings(payload: {
    practiceItemIds: string[];
    dailyLightGoal: number;
    totalLightGoal: number;
  }) {
    const { data } = await this.client.put('/api/user/settings', payload);
    return data;
  }

  // ─── 실천 기록 API ───────────────────────────────────────────────
  async getPracticeLogs(date: string) {
    const { data } = await this.client.get('/api/practice-logs', { params: { date } });
    return data;
  }

  async savePracticeLog(log: {
    practiceItemId: string;
    date: string;
    count: number;
    lightPerUnit: number;
  }) {
    const { data } = await this.client.post('/api/practice-logs', log);
    return data;
  }

  async savePracticeLogsBatch(date: string, logs: { practiceItemId: string; count: number; lightPerUnit: number }[]) {
    const { data } = await this.client.put('/api/practice-logs', { date, logs });
    return data;
  }

  // ─── 통계 API ────────────────────────────────────────────────────
  async getMyStats(start?: string, end?: string) {
    const { data } = await this.client.get('/api/stats', { params: { type: 'my', start, end } });
    return data;
  }

  async getTotalLight(date?: string) {
    const { data } = await this.client.get('/api/stats', { params: { type: 'total-light', date } });
    return data;
  }

  // ─── 관리자 통계 API ─────────────────────────────────────────────
  async getAdminDailyStats(date: string) {
    const { data } = await this.client.get('/api/admin/stats', { params: { type: 'daily', date } });
    return data;
  }

  async getAdminUserStats(userId: string, start?: string, end?: string) {
    const { data } = await this.client.get('/api/admin/stats', { params: { type: 'user', userId, start, end } });
    return data;
  }

  async getAdminTotalStats(start?: string, end?: string) {
    const { data } = await this.client.get('/api/admin/stats', { params: { type: 'total', start, end } });
    return data;
  }

  async getAdminHistoryStats(start?: string, end?: string) {
    const { data } = await this.client.get('/api/admin/stats', { params: { type: 'history', start, end } });
    return data;
  }

  async getAdminHistoryDetailStats(start?: string, end?: string) {
    const { data } = await this.client.get('/api/admin/stats', { params: { type: 'history-detail', start, end } });
    return data;
  }

  /** 엑셀(CSV) 다운로드 URL 생성 후 브라우저 다운로드 트리거 */
  downloadAdminExport(type: string, params: Record<string, string>) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const searchParams = new URLSearchParams({ type, ...params });
    // fetch로 blob 다운로드
    return this.client.get(`/api/admin/export?${searchParams.toString()}`, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  }

  // ─── 이벤트 API ────────────────────────────────────────────────
  async getEvents() {
    const { data } = await this.client.get('/api/events');
    return data;
  }

  async createEvent(name: string, lightThreshold: number) {
    const { data } = await this.client.post('/api/events', { name, lightThreshold });
    return data;
  }

  async deleteEvent(id: string) {
    const { data } = await this.client.delete(`/api/events?id=${id}`);
    return data;
  }

  /** 저장 후 이벤트 당첨 확인 */
  async checkEventWin(totalLight: number, userName: string) {
    const { data } = await this.client.post('/api/events/check-win', { totalLight, userName });
    return data; // { newWins: Event[] }
  }

  // ─── 개인 이벤트 API ─────────────────────────────────────────
  async getPersonalEvents() {
    const { data } = await this.client.get('/api/personal-events');
    return data;
  }

  async createPersonalEvent(payload: { userId: string; userName: string; name: string; lightThreshold: number; bouquetImageUrl?: string }) {
    const { data } = await this.client.post('/api/personal-events', payload);
    return data;
  }

  async deletePersonalEvent(id: string) {
    const { data } = await this.client.delete(`/api/personal-events?id=${id}`);
    return data;
  }

  /** 저장 후 개인 이벤트 달성 확인 */
  async checkPersonalEventAchieve(totalLight: number) {
    const { data } = await this.client.post('/api/personal-events/check-achieve', { totalLight });
    return data; // { newAchievements: PersonalEvent[] }
  }
}

export const api = new ApiClient();
