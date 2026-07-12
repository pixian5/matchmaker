/**
 * 客户端业务接口
 */
import { get, post, patch, del } from "./request";

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

// 会员确认牵线结果，成功奖励只能由会员本人触发
export const confirmMatchOutcomeApi = (id, outcome = "stable_progress") =>
  patch(`/client/match-requests/${id}/outcome`, { outcome });

// 提交实名认证
export const submitRealNameApi = (data) => post("/client/real-name", data);

// 提交学历认证
export const submitEducationVerifyApi = (data) => post("/client/education-verify", data);

// 提交视频认证
export const submitVideoVerifyApi = (data) => post("/client/video-verify", data);

// 获取认证状态
export const getVerifyStatusApi = () => get("/client/verify-status");

// 拉黑用户
export const blockUserApi = (data) => post("/client/blocks", data);

// 取消拉黑
export const unblockUserApi = (blockedId) => del(`/client/blocks/${blockedId}`);

// 举报用户
export const reportUserApi = (data) => post("/client/reports", data);

// 获取拉黑列表
export const getBlocksApi = () => get("/client/blocks");

// VIP 兑换
export const redeemVipApi = (data) => post("/client/vip/redeem", data);
