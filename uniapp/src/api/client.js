/**
 * 客户端业务接口
 */
import { get, post, patch } from "./request";

// 获取当前用户资料
export const getMeApi = () => get("/client/me");

// 更新个人资料
export const updateProfileApi = (data) => patch("/client/profile", data);

// 获取异性资料列表（分页 + 筛选）
export const getProfilesApi = (params) => get("/client/profiles", params);

// 获取指定用户详情
export const getProfileDetailApi = (id) => get(`/client/profiles/${id}`);

// 提交牵线申请
export const createMatchRequestApi = (data) => post("/client/match-requests", data);

// 获取我的牵线记录
export const getMatchRequestsApi = () => get("/client/match-requests");

// 提交实名认证
export const submitRealNameApi = (data) => post("/client/real-name", data);

// VIP 兑换
export const redeemVipApi = (data) => post("/client/vip/redeem", data);
