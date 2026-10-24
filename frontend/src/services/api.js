/**
 * FreelanceHub API Service Layer
 * Built with native browser Fetch API, automated JWT silent token refresh,
 * request queuing for simultaneous 401s, and clean error parsing.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token Storage Keys
export const TOKEN_KEYS = {
  ACCESS: 'fh_access_token',
  REFRESH: 'fh_refresh_token',
  USER: 'fh_user_profile',
};

// Queue handling for concurrent requests during token refresh
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newAccessToken) {
  refreshSubscribers.forEach((cb) => cb(newAccessToken));
  refreshSubscribers = [];
}

async function performTokenRefresh() {
  const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH);
  if (!refreshToken) throw new Error('No refresh token available');

  const response = await fetch(`${API_BASE_URL}/api/accounts/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!response.ok) {
    localStorage.removeItem(TOKEN_KEYS.ACCESS);
    localStorage.removeItem(TOKEN_KEYS.REFRESH);
    localStorage.removeItem(TOKEN_KEYS.USER);
    window.dispatchEvent(new CustomEvent('fh:auth-expired'));
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json();
  localStorage.setItem(TOKEN_KEYS.ACCESS, data.access);
  if (data.refresh) localStorage.setItem(TOKEN_KEYS.REFRESH, data.refresh);
  return data.access;
}

export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  const headers = { ...options.headers };

  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const accessToken = localStorage.getItem(TOKEN_KEYS.ACCESS);
  if (accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  options.headers = headers;

  let response = await fetch(url, options);

  if (response.status === 401 && !url.includes('/token/refresh/')) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const newAccessToken = await performTokenRefresh();
        isRefreshing = false;
        onRefreshed(newAccessToken);
      } catch (refreshErr) {
        isRefreshing = false;
        refreshSubscribers = [];
        throw refreshErr;
      }
    }

    return new Promise((resolve, reject) => {
      subscribeTokenRefresh(async (newToken) => {
        try {
          const retryHeaders = { ...options.headers, Authorization: `Bearer ${newToken}` };
          const retryResponse = await fetch(url, { ...options, headers: retryHeaders });
          const retryData = await retryResponse.json().catch(() => ({}));
          if (!retryResponse.ok) reject({ status: retryResponse.status, data: retryData });
          else resolve(retryData);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  // Handle 204 No Content
  if (response.status === 204) return {};

  const responseData = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw {
      status: response.status,
      data: responseData,
      message: responseData.message || responseData.detail || 'Request failed',
    };
  }

  return responseData;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authAPI = {
  async register(payload) {
    const data = await apiFetch('/api/accounts/register/', { method: 'POST', body: payload });
    if (data.tokens) {
      localStorage.setItem(TOKEN_KEYS.ACCESS, data.tokens.access);
      localStorage.setItem(TOKEN_KEYS.REFRESH, data.tokens.refresh);
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(data.user));
    }
    return data;
  },

  async login(email, password) {
    const data = await apiFetch('/api/accounts/login/', { method: 'POST', body: { email, password } });
    if (data.tokens) {
      localStorage.setItem(TOKEN_KEYS.ACCESS, data.tokens.access);
      localStorage.setItem(TOKEN_KEYS.REFRESH, data.tokens.refresh);
      localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(data.user));
    }
    return data;
  },

  async logout() {
    const refreshToken = localStorage.getItem(TOKEN_KEYS.REFRESH);
    try {
      if (refreshToken) await apiFetch('/api/accounts/logout/', { method: 'POST', body: { refresh: refreshToken } });
    } finally {
      localStorage.removeItem(TOKEN_KEYS.ACCESS);
      localStorage.removeItem(TOKEN_KEYS.REFRESH);
      localStorage.removeItem(TOKEN_KEYS.USER);
    }
  },

  async getCurrentUser() { return apiFetch('/api/accounts/me/'); },
  async updateProfile(payload) { return apiFetch('/api/accounts/me/', { method: 'PATCH', body: payload }); },
};

// ─── Profiles API ─────────────────────────────────────────────────────────────
export const profilesAPI = {
  async getCategories() { return apiFetch('/api/profiles/categories/'); },
  async getSkills(category) {
    const q = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiFetch(`/api/profiles/skills/${q}`);
  },
  async getFreelancerProfile() { return apiFetch('/api/profiles/freelancer/'); },
  async updateFreelancerProfile(payload) { return apiFetch('/api/profiles/freelancer/', { method: 'PATCH', body: payload }); },
  async getCustomerProfile() { return apiFetch('/api/profiles/customer/'); },
  async updateCustomerProfile(payload) { return apiFetch('/api/profiles/customer/', { method: 'PATCH', body: payload }); },
  async uploadResume(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch('/api/profiles/resume/upload/', { method: 'POST', body: formData });
  },
  async getResume() { return apiFetch('/api/profiles/resume/'); },
  async getPortfolios() {
    const res = await apiFetch('/api/profiles/portfolio/');
    return res.results || res;
  },
  async createPortfolio(payload) { return apiFetch('/api/profiles/portfolio/', { method: 'POST', body: payload }); },
  async deletePortfolio(id) { return apiFetch(`/api/profiles/portfolio/${id}/`, { method: 'DELETE' }); },
  async getPublicFreelancerProfile(id) { return apiFetch(`/api/profiles/freelancers/${id}/`); },
};

// ─── Projects API ─────────────────────────────────────────────────────────────
export const projectsAPI = {
  async list(params = {}) {
    const queryString = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
    ).toString();
    return apiFetch(`/api/projects/${queryString ? '?' + queryString : ''}`);
  },
  async get(id) { return apiFetch(`/api/projects/${id}/`); },
  async create(payload) { return apiFetch('/api/projects/', { method: 'POST', body: payload }); },
  async update(id, payload) { return apiFetch(`/api/projects/${id}/`, { method: 'PATCH', body: payload }); },
  async delete(id) { return apiFetch(`/api/projects/${id}/`, { method: 'DELETE' }); },
  async getMyProjects() { return apiFetch('/api/projects/my/'); },
  async getContracts() { return apiFetch('/api/projects/contracts/'); },
  async updateMilestone(milestoneId, newStatus) {
    return apiFetch(`/api/projects/milestones/${milestoneId}/`, { method: 'PATCH', body: { status: newStatus } });
  },
  async hireFreelancer(projectId, bidId) {
    return apiFetch(`/api/projects/${projectId}/hire/`, { method: 'POST', body: { bid_id: bidId } });
  },
};

// ─── Bids API ─────────────────────────────────────────────────────────────────
export const bidsAPI = {
  async submit(payload) { return apiFetch('/api/bids/', { method: 'POST', body: payload }); },
  async getMyBids() { return apiFetch('/api/bids/my/'); },
  async getProjectBids(projectId) { return apiFetch(`/api/bids/project/${projectId}/`); },
  async get(bidId) { return apiFetch(`/api/bids/${bidId}/`); },
  async update(bidId, payload) { return apiFetch(`/api/bids/${bidId}/`, { method: 'PATCH', body: payload }); },
  async withdraw(bidId) { return apiFetch(`/api/bids/${bidId}/withdraw/`, { method: 'POST' }); },
  async shortlist(bidId) { return apiFetch(`/api/bids/${bidId}/action/`, { method: 'POST', body: { action: 'SHORTLIST' } }); },
  async reject(bidId) { return apiFetch(`/api/bids/${bidId}/action/`, { method: 'POST', body: { action: 'REJECT' } }); },
};

// ─── Assessments API ──────────────────────────────────────────────────────────
export const assessmentsAPI = {
  async start(skillFocus = []) { return apiFetch('/api/assessments/start/', { method: 'POST', body: { skill_focus: skillFocus } }); },
  async getActive() { return apiFetch('/api/assessments/active/'); },
  async get(id) { return apiFetch(`/api/assessments/${id}/`); },
  async submit(id, answers) { return apiFetch(`/api/assessments/${id}/submit/`, { method: 'POST', body: { answers } }); },
  async getHistory() { return apiFetch('/api/assessments/history/'); },
};

// ─── Messaging API ────────────────────────────────────────────────────────────
export const messagingAPI = {
  async getConversations() { return apiFetch('/api/messaging/'); },
  async getConversation(id) { return apiFetch(`/api/messaging/${id}/`); },
  async sendMessage(conversationId, content) {
    return apiFetch(`/api/messaging/${conversationId}/send/`, { method: 'POST', body: { content } });
  },
  async startConversation(userId, projectId = null) {
    return apiFetch('/api/messaging/start/', { method: 'POST', body: { user_id: userId, project_id: projectId } });
  },
  async getUnreadCount() { return apiFetch('/api/messaging/unread/'); },
};

// ─── Reviews API ──────────────────────────────────────────────────────────────
export const reviewsAPI = {
  async createReview(payload) { return apiFetch('/api/reviews/', { method: 'POST', body: payload }); },
  async getUserReviews(userId) { return apiFetch(`/api/reviews/user/${userId}/`); },
  async getUserRatingSummary(userId) { return apiFetch(`/api/reviews/user/${userId}/summary/`); },
};

// ─── Notifications API ────────────────────────────────────────────────────────
export const notificationsAPI = {
  async list(unreadOnly = false) {
    const q = unreadOnly ? '?unread=true' : '';
    return apiFetch(`/api/messaging/notifications/${q}`);
  },
  async markRead(id) {
    return apiFetch(`/api/messaging/notifications/${id}/read/`, { method: 'POST' });
  },
  async markAllRead() {
    return apiFetch('/api/messaging/notifications/read-all/', { method: 'POST' });
  },
};
