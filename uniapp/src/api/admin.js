/**
 * 管理后台业务接口
 */
import { get, post, patch } from "./request";

// 获取全局状态（概览、列表等基础数据）
export const getAdminStateApi = () => get("/state");

// 模拟成交
export const simulateDealApi = () => post("/admin/deals/simulate");

// 添加机构
export const addAgencyApi = (data) => post("/admin/agencies", data);

// 添加红娘
export const addMatchmakerApi = (data) => post("/admin/matchmakers", data);

// 保存分成比例
export const saveSplitsApi = (data) => patch("/admin/splits", data);

// 生成兑换码
export const generatePromoCodeApi = (data) => post("/admin/promo-codes", data);
