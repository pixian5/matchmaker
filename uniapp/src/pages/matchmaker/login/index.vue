<template>
  <view class="login-container">
    <view class="brand-section">
      <view class="brand-mark">红</view>
      <text class="brand-title">红娘工作台</text>
      <text class="brand-subtitle">专业服务，成就良缘</text>
    </view>

    <view class="tab-bar">
      <view class="tab-item" :class="{ active: mode === 'login' }" @click="mode = 'login'">
        一键登录
      </view>
      <view class="tab-item" :class="{ active: mode === 'register' }" @click="mode = 'register'">
        注册红娘
      </view>
    </view>

    <!-- 登录面板 -->
    <view v-if="mode === 'login'" class="form-section">
      <view class="form-group">
        <text class="form-label">选择红娘</text>
        <picker mode="selector" :range="matchmakerOptions" :value="loginIndex" @change="handleLoginChange">
          <view class="picker-value">{{ loginOptions[loginIndex]?.label || '请选择' }}</view>
        </picker>
      </view>
      <button class="btn-primary" @click="handleLogin" :class="{ disabled: loading || !loginOptions.length }">
        {{ loading ? '登录中...' : '一键登录' }}
      </button>
    </view>

    <!-- 注册面板 -->
    <view v-else class="form-section">
      <view class="form-group">
        <text class="form-label">姓名</text>
        <input class="form-input" v-model="registerForm.name" placeholder="请输入姓名" />
      </view>
      <view class="form-group">
        <text class="form-label">所属机构</text>
        <picker mode="selector" :range="agencyOptions" :value="agencyIndex" @change="handleAgencyChange">
          <view class="picker-value">{{ agencyOptions[agencyIndex] || '请选择机构' }}</view>
        </picker>
      </view>
      <view class="form-group">
        <text class="form-label">手机号</text>
        <input class="form-input" v-model="registerForm.phone" type="number" placeholder="请输入11位手机号" />
      </view>
      <view class="form-group">
        <text class="form-label">邮箱（选填）</text>
        <input class="form-input" v-model="registerForm.email" placeholder="请输入邮箱" />
      </view>
      <view class="form-group">
        <text class="form-label">推荐码</text>
        <input class="form-input" v-model="registerForm.code" placeholder="请输入推荐码，如 HM-LILI" />
      </view>
      <view class="form-group">
        <text class="form-label">登录密码</text>
        <input class="form-input" v-model="registerForm.password" password placeholder="至少6位" />
      </view>
      <view class="form-group">
        <text class="form-label">确认密码</text>
        <input class="form-input" v-model="registerForm.passwordConfirm" password placeholder="再次输入密码" />
      </view>
      <button class="btn-primary" @click="handleRegister" :class="{ disabled: loading }">
        {{ loading ? '注册中...' : '注册并登录' }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { matchmakerLoginApi, matchmakerRegisterApi } from '@/api/auth';
import { useUserStore } from '@/store/user';
import { useAppStore } from '@/store/appStore';

const userStore = useUserStore();
const appStore = useAppStore();

const mode = ref('login');
const loading = ref(false);
const loginIndex = ref(0);

const registerForm = reactive({
  name: '',
  agencyId: '',
  phone: '',
  email: '',
  code: '',
  password: '',
  passwordConfirm: ''
});

// 已有红娘列表（用于一键登录与注册机构选择）
const matchmakers = computed(() => appStore.matchmakers);
const agencies = computed(() => appStore.agencies);

const loginOptions = computed(() => {
  return matchmakers.value.map((m) => {
    const agency = agencies.value.find((a) => a.id === m.agencyId);
    return {
      value: m.id,
      label: `${m.name} [${m.code}]（${agency?.name || '未知机构'}）`
    };
  });
});

const matchmakerOptions = computed(() => loginOptions.value.map((item) => item.label));

const agencyOptions = computed(() => agencies.value.map((a) => `${a.name}（${a.city}）`));
const agencyIndex = ref(0);

onShow(() => {
  appStore.fetchState();
});

const handleLoginChange = (e) => {
  loginIndex.value = e.detail.value;
};

const handleAgencyChange = (e) => {
  agencyIndex.value = e.detail.value;
  registerForm.agencyId = agencies.value[agencyIndex.value]?.id || '';
};

const handleLogin = async () => {
  const option = loginOptions.value[loginIndex.value];
  if (!option) {
    uni.showToast({ title: '暂无可选红娘', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const res = await matchmakerLoginApi({ matchmakerId: option.value });
    const token = res.data?.token || res.token;
    const matchmaker = res.data?.matchmaker || res.matchmaker;
    if (token && matchmaker) {
      userStore.setLogin({ token, matchmaker }, 'matchmaker');
      await appStore.fetchState();
      uni.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/matchmaker/workbench/index' });
      }, 800);
    } else {
      throw new Error('登录失败，未获取到凭证');
    }
  } catch (error) {
    // 错误由 request 拦截器提示
  } finally {
    loading.value = false;
  }
};

const handleRegister = async () => {
  const { name, phone, email, code, password, passwordConfirm } = registerForm;
  if (!name) {
    uni.showToast({ title: '请输入姓名', icon: 'none' });
    return;
  }
  if (!/^\d{11}$/.test(phone)) {
    uni.showToast({ title: '请输入合法的11位手机号', icon: 'none' });
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    uni.showToast({ title: '请输入合法的邮箱地址', icon: 'none' });
    return;
  }
  if (password.length < 6) {
    uni.showToast({ title: '登录密码至少 6 位', icon: 'none' });
    return;
  }
  if (password !== passwordConfirm) {
    uni.showToast({ title: '两次输入的密码不一致', icon: 'none' });
    return;
  }

  const agency = agencies.value[agencyIndex.value];
  loading.value = true;
  try {
    const res = await matchmakerRegisterApi({
      name,
      agencyId: agency?.id || null,
      code: code.toUpperCase(),
      phone,
      email,
      password
    });
    const token = res.data?.token || res.token;
    const matchmaker = res.data?.matchmaker || res.matchmaker;
    if (token && matchmaker) {
      userStore.setLogin({ token, matchmaker }, 'matchmaker');
      await appStore.fetchState();
      uni.showToast({ title: '注册成功', icon: 'success' });
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/matchmaker/workbench/index' });
      }, 800);
    } else {
      throw new Error('注册失败');
    }
  } catch (error) {
    // 错误由 request 拦截器提示
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.login-container {
  min-height: 100vh;
  background-color: $color-panel;
  padding: $spacing-xl;
}

.brand-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 80rpx;
  margin-bottom: 60rpx;

  .brand-mark {
    width: 120rpx;
    height: 120rpx;
    background: linear-gradient(135deg, #0f766e, #14b8a6);
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 60rpx;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: $spacing-md;
  }

  .brand-title {
    font-size: $font-title;
    font-weight: bold;
    color: $color-ink;
    margin-bottom: $spacing-xs;
  }

  .brand-subtitle {
    font-size: $font-base;
    color: $color-muted;
  }
}

.tab-bar {
  display: flex;
  gap: $spacing-md;
  margin-bottom: $spacing-lg;

  .tab-item {
    flex: 1;
    text-align: center;
    padding: $spacing-sm 0;
    font-size: $font-md;
    color: $color-muted;
    border-bottom: 4rpx solid $color-line;

    &.active {
      color: $color-primary;
      border-bottom-color: $color-primary;
      font-weight: 600;
    }
  }
}

.picker-value {
  width: 100%;
  height: 80rpx;
  padding: 0 $spacing-md;
  background: $color-paper;
  border: 2rpx solid $color-line;
  border-radius: $radius-md;
  font-size: $font-base;
  color: $color-ink;
  display: flex;
  align-items: center;
}
</style>
