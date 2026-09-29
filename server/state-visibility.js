const VIEWER_ROLES = new Set(["admin", "client", "matchmaker"]);
const PUBLIC_USER_FIELDS = [
  "id",
  "name",
  "gender",
  "age",
  "city",
  "job",
  "bio",
  "requirements",
  "photo",
  "vip",
  "realNameVerified",
  "videoVerified",
  "education",
  "createdAt",
  "updatedAt",
];

export function stripKeysDeep(value, keys) {
  if (Array.isArray(value)) return value.map((item) => stripKeysDeep(item, keys));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !keys.has(key))
      .map(([key, item]) => [key, stripKeysDeep(item, keys)]),
  );
}

export function sanitizePrivateIdentifiers(value) {
  return stripKeysDeep(value, new Set(["passwordHash", "idCard"]));
}


export function serializeMatchmakerReviewUser(user, matchmakerId) {
  const sensitiveFields = new Set(["passwordHash", "idCard", "phone", "email", "realName", "diplomaNo"]);
  const clean = stripKeysDeep(user, sensitiveFields);
  const profile = user?.profileByMatchmaker?.[matchmakerId];
  clean.profileByMatchmaker = profile
    ? { [matchmakerId]: stripKeysDeep(profile, sensitiveFields) }
    : {};
  return clean;
}

export function serializePublicMatchmaker(matchmaker) {
  const { id, name, code, agencyId, photo } = matchmaker || {};
  return { id, name, code, agencyId, photo: photo || null };
}

function sanitizePublicUser(user) {
  const cleaned = sanitizePrivateIdentifiers(user);
  const publicUser = Object.fromEntries(
    PUBLIC_USER_FIELDS
      .filter((field) => Object.hasOwn(cleaned, field))
      .map((field) => [field, cleaned[field]]),
  );
  if (publicUser.education && typeof publicUser.education === "object") {
    const { diplomaNo, ...education } = publicUser.education;
    publicUser.education = education;
  }
  return publicUser;
}

function sanitizeMatchmakerUser(user, matchmakerId) {
  // 红娘只能看到自己服务会员的业务资料：不返回手机号、邮箱、真实姓名等联系方式。
  const cleaned = stripKeysDeep(user, new Set(["passwordHash", "idCard", "diplomaNo", "phone", "email", "realName"]));
  const { profileByMatchmaker = {}, servicePlans, servicePlan, ...rest } = cleaned;
  const matchmakerProfile = profileByMatchmaker?.[matchmakerId];
  const safeUser = {
    ...rest,
    matchmakerIds: (Array.isArray(rest.matchmakerIds) ? rest.matchmakerIds : [])
      .filter((id) => id === matchmakerId),
    profileByMatchmaker: matchmakerProfile
      ? { [matchmakerId]: stripKeysDeep(matchmakerProfile, new Set(["passwordHash", "idCard", "diplomaNo", "phone", "email", "realName"])) }
      : {},
  };

  if (Array.isArray(servicePlans)) {
    safeUser.servicePlans = servicePlans.filter((plan) => plan.matchmakerId === matchmakerId);
  }
  if (servicePlan?.matchmakerId === matchmakerId) {
    safeUser.servicePlan = sanitizePrivateIdentifiers(servicePlan);
  }
  return safeUser;
}

function hasParticipant(thread, role, id) {
  return (thread.participants || []).some(
    (participant) => participant.role === role && participant.id === id,
  );
}

function sanitizeMatchmaker(matchmaker, role, viewerId, ensureMetrics) {
  const clean = sanitizePrivateIdentifiers(ensureMetrics({ ...matchmaker }));
  if (role === "admin" || (role === "matchmaker" && matchmaker.id === viewerId)) return clean;
  const { phone, email, ...publicFields } = clean;
  return publicFields;
}

/**
 * 按调用者角色生成最小业务状态。必须显式传角色，避免默认落入管理员全量视图。
 */
export function serializePublicState(data, viewerRole, viewerId, ensureMetrics = (value) => value) {
  if (!VIEWER_ROLES.has(viewerRole)) {
    throw new TypeError("viewerRole must be an authenticated application role");
  }
  if (viewerRole !== "admin" && !viewerId) {
    throw new TypeError("viewerId is required for non-admin state");
  }

  const users = Array.isArray(data.users) ? data.users : [];
  const matchmakers = Array.isArray(data.matchmakers) ? data.matchmakers : [];
  const requests = Array.isArray(data.requests) ? data.requests : [];
  const threads = Array.isArray(data.chatThreads) ? data.chatThreads : [];
  const messages = Array.isArray(data.chatMessages) ? data.chatMessages : [];

  if (viewerRole === "admin") {
    return {
      ...data,
      users: users.map(sanitizePrivateIdentifiers),
      matchmakers: matchmakers.map((matchmaker) =>
        sanitizeMatchmaker(matchmaker, viewerRole, viewerId, ensureMetrics),
      ),
    };
  }

  const visibleRequests = viewerRole === "client"
    ? requests.filter((request) => request.fromUserId === viewerId || request.toUserId === viewerId)
    : requests.filter((request) => request.matchmakerId === viewerId);
  // 会话必须明确包含当前角色和账号；不能仅凭 requestId 暴露同一牵线下另一人的私聊。
  const visibleThreads = threads.filter((thread) => hasParticipant(thread, viewerRole, viewerId));
  const threadIds = new Set(visibleThreads.map((thread) => thread.id));
  const visibleMessages = messages.filter((message) => threadIds.has(message.threadId));

  if (viewerRole === "client") {
    const visibleUserIds = new Set([viewerId]);
    for (const request of visibleRequests) {
      visibleUserIds.add(request.fromUserId);
      visibleUserIds.add(request.toUserId);
    }
    const visibleUsers = users
      .filter((user) => visibleUserIds.has(user.id))
      .map((user) => user.id === viewerId
        ? sanitizePrivateIdentifiers(user)
        : sanitizePublicUser(user));
    const matchmakerIds = new Set([
      ...visibleRequests.map((request) => request.matchmakerId),
      ...(users.find((user) => user.id === viewerId)?.matchmakerIds || []),
    ].filter(Boolean));
    const visibleMatchmakers = matchmakers
      .filter((matchmaker) => matchmakerIds.has(matchmaker.id))
      .map((matchmaker) => sanitizeMatchmaker(matchmaker, viewerRole, viewerId, ensureMetrics));
    const agencyIds = new Set(visibleMatchmakers.map((matchmaker) => matchmaker.agencyId).filter(Boolean));

    return {
      users: visibleUsers,
      matchmakers: visibleMatchmakers,
      agencies: (data.agencies || []).filter((agency) => agencyIds.has(agency.id))
        .map(({ id, name, city }) => ({ id, name, city })),
      requests: visibleRequests,
      chatThreads: visibleThreads,
      chatMessages: visibleMessages,
      deals: (data.deals || []).filter((deal) => deal.userId === viewerId),
      promoCodes: (data.promoCodes || []).filter((code) => code.usedBy === viewerId),
    };
  }

  const relatedUserIds = new Set();
  for (const request of visibleRequests) {
    relatedUserIds.add(request.fromUserId);
    relatedUserIds.add(request.toUserId);
  }
  for (const user of users) {
    if (
      user.matchmakerIds?.includes(viewerId) ||
      Object.hasOwn(user.profileByMatchmaker || {}, viewerId)
    ) {
      relatedUserIds.add(user.id);
    }
  }
  const visibleUsers = users
    .filter((user) => relatedUserIds.has(user.id))
    .map((user) => sanitizeMatchmakerUser(user, viewerId));
  const ownMatchmaker = matchmakers.find((matchmaker) => matchmaker.id === viewerId);
  const visibleMatchmakers = ownMatchmaker
    ? [sanitizeMatchmaker(ownMatchmaker, viewerRole, viewerId, ensureMetrics)]
    : [];
  const agencyIds = new Set(visibleMatchmakers.map((matchmaker) => matchmaker.agencyId).filter(Boolean));

  return {
    users: visibleUsers,
    matchmakers: visibleMatchmakers,
    agencies: (data.agencies || []).filter((agency) => agencyIds.has(agency.id))
      .map(({ id, name, city }) => ({ id, name, city })),
    requests: visibleRequests,
    chatThreads: visibleThreads,
    chatMessages: visibleMessages,
    deals: [],
    promoCodes: (data.promoCodes || []).filter((code) => code.matchmakerId === viewerId),
  };
}
