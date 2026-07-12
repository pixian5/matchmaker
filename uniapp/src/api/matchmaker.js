/**
 * 红娘端业务接口
 */
import { get, post, patch } from "./request";

// 获取全局状态（工作台基础数据）
export const getStateApi = () => get("/state");

// 获取红娘工作台数据（优先使用 /state，后续可替换为 /matchmaker/dashboard）
export const getMatchmakerDashboardApi = () => get("/state");

// 开关群聊
export const toggleMemberChatApi = (requestId, enabled) =>
  patch(`/matchmaker/requests/${requestId}/member-chat`, { enabled });

// 更新服务进度：action 如 follow_up / effective_match / not_fit / stable_progress
export const updateServiceProgressApi = (requestId, action) =>
  patch(`/matchmaker/requests/${requestId}/service-progress`, { action });

// 资料审核：action 为 approve 或 reject
export const reviewProfileApi = (userId, action) =>
  patch(`/matchmaker/users/${userId}/profile-review`, { action });

// 获取聊天消息
export const getMatchmakerMessagesApi = (threadId) =>
  get(`/chat/threads/${threadId}/messages`);

// 发送聊天消息
export const sendMatchmakerMessageApi = (threadId, data) =>
  post(`/chat/threads/${threadId}/messages`, data);
