/**
 * 认证相关接口
 */
import { post } from "./request";

// 客户端登录
export const loginApi = (data) => post("/auth/client/login", data, { noAuth: true });

// 客户端注册
export const registerApi = (data) => post("/auth/client/register", data, { noAuth: true });

// 登出（本地清除即可）
export const logoutApi = () => {
  uni.removeStorageSync("matchmaker_session");
};
