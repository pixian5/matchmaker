/**
 * 聊天相关接口
 */
import { get, post } from "./request";

// 获取聊天列表
export const getChatThreadsApi = () => get("/client/chat/threads");

// 获取聊天消息
export const getChatMessagesApi = (threadId) => get(`/client/chat/threads/${threadId}/messages`);

// 发送消息
export const sendMessageApi = (threadId, data) => post(`/chat/threads/${threadId}/messages`, data);
