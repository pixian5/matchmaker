/**
 * 全局业务数据状态
 * 集中存储 users、matchmakers、agencies、requests、splits、promoCodes、deals、chatThreads
 * 原 HTML 项目为整包 state，uniapp 侧按需读取并维护
 */
import { defineStore } from "pinia";
import { getStateApi } from "../api/matchmaker";

export const useAppStore = defineStore("app", {
  state: () => ({
    // 基础业务数据
    users: [],
    matchmakers: [],
    agencies: [],
    requests: [],
    splits: {
      promo: 20,
      matchmaker: 35,
      platform: 45,
    },
    promoCodes: [],
    deals: [],
    chatThreads: [],
    chatMessages: [],
    // 加载状态
    loading: false,
    lastUpdated: "",
  }),

  getters: {
    // 当前红娘负责的所有牵线请求
    requestsForMatchmaker: (state) => (matchmakerId) => {
      if (!matchmakerId) return [];
      return state.requests.filter((item) => item.matchmakerId === matchmakerId);
    },

    // 当前红娘待审核的资料
    pendingProfilesForMatchmaker: (state) => (matchmakerId) => {
      if (!matchmakerId) return [];
      return state.users
        .map((user) => ({ user, profile: user.profileByMatchmaker?.[matchmakerId] }))
        .filter((item) => item.profile?.status === "pending");
    },

    // 当前红娘的聊天会话（member_matchmaker 一对一、matchmaker_group 三方群聊）
    threadsForMatchmaker: (state) => (matchmakerId) => {
      if (!matchmakerId || !state.chatThreads?.length) return [];
      return state.chatThreads.filter((thread) => {
        const participants = thread.participants || [];
        const hasMatchmaker = participants.some(
          (p) => p.role === "matchmaker" && p.id === matchmakerId
        );
        if (!hasMatchmaker) return false;
        if (thread.type === "member_matchmaker") return participants.length === 2;
        if (thread.type === "matchmaker_group") return true;
        return false;
      });
    },

    // 按 ID 查找用户
    getUserById: (state) => (id) => state.users.find((u) => u.id === id),

    // 按 ID 查找红娘
    getMatchmakerById: (state) => (id) => state.matchmakers.find((m) => m.id === id),

    // 按 ID 查找机构
    getAgencyById: (state) => (id) => state.agencies.find((a) => a.id === id),

    // 按 ID 查找请求
    getRequestById: (state) => (id) => state.requests.find((r) => r.id === id),

    // 按 ID 查找会话
    getThreadById: (state) => (id) => state.chatThreads.find((t) => t.id === id),

    // 获取指定会话的消息
    messagesForThread: (state) => (threadId) => {
      return state.chatMessages.filter((m) => m.threadId === threadId);
    },
  },

  actions: {
    // 从 /api/state 拉取完整业务数据
    async fetchState() {
      this.loading = true;
      try {
        const res = await getStateApi();
        const state = res.data || res;
        this.applyState(state);
      } catch (e) {
        // 失败时保留本地数据，错误提示由 request 拦截器处理
      } finally {
        this.loading = false;
      }
    },

    // 应用服务端返回的 state 对象
    applyState(state) {
      if (!state || typeof state !== "object") return;
      if (Array.isArray(state.users)) this.users = state.users;
      if (Array.isArray(state.matchmakers)) this.matchmakers = state.matchmakers;
      if (Array.isArray(state.agencies)) this.agencies = state.agencies;
      if (Array.isArray(state.requests)) this.requests = state.requests;
      if (state.splits && typeof state.splits === "object") this.splits = state.splits;
      if (Array.isArray(state.promoCodes)) this.promoCodes = state.promoCodes;
      if (Array.isArray(state.deals)) this.deals = state.deals;
      if (Array.isArray(state.chatThreads)) this.chatThreads = state.chatThreads;
      if (Array.isArray(state.chatMessages)) this.chatMessages = state.chatMessages;
      this.lastUpdated = new Date().toISOString();
    },

    // 增量更新某条请求
    updateRequest(request) {
      if (!request?.id) return;
      const index = this.requests.findIndex((r) => r.id === request.id);
      if (index >= 0) {
        this.requests[index] = { ...this.requests[index], ...request };
      } else {
        this.requests.push(request);
      }
    },

    // 增量更新某个用户
    updateUser(user) {
      if (!user?.id) return;
      const index = this.users.findIndex((u) => u.id === user.id);
      if (index >= 0) {
        this.users[index] = { ...this.users[index], ...user };
      } else {
        this.users.push(user);
      }
    },

    // 增量更新某个会话
    updateThread(thread) {
      if (!thread?.id) return;
      const index = this.chatThreads.findIndex((t) => t.id === thread.id);
      if (index >= 0) {
        this.chatThreads[index] = { ...this.chatThreads[index], ...thread };
      } else {
        this.chatThreads.push(thread);
      }
    },

    // 增量更新某条消息
    updateMessage(message) {
      if (!message?.id) return;
      const index = this.chatMessages.findIndex((m) => m.id === message.id);
      if (index >= 0) {
        this.chatMessages[index] = { ...this.chatMessages[index], ...message };
      } else {
        this.chatMessages.push(message);
      }
    },
  },
});
