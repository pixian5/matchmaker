<template>
  <view class="login-container">
    <view class="brand-section">
      <view class="brand-mark">管</view>
      <text class="brand-title">管理后台</text>
      <text class="brand-subtitle">平台运营控制台</text>
    </view>
    <view class="form-section">
      <view class="form-group">
        <text class="form-label">管理员密码</text>
        <input class="form-input" v-model="password" password placeholder="默认密码为 admin" />
      </view>
      <button class="btn-primary" @click="handleLogin" :class="{ disabled: loading }">
        {{ loading ? '登录中...' : '登录' }}
      </button>
      <view class="hint">默认演示密码为 admin</view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { adminLoginApi } from '@/api/auth';
import { useUserStore } from '@/store/user';
import { useAppStore } from '@/store/appStore';

const userStore = useUserStore();
const appStore = useAppStore();

const password = ref('');
const loading = ref(false);

const handleLogin = async () => {
  if (!password.value) {
    uni.showToast({ title: '请输入管理员密码', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    const res = await adminLoginApi({ password: password.value });
    const token = res.data?.token || res.token;
    const admin = res.data?.admin || res.admin;
    if (token) {
      userStore.setLogin({ token, admin: admin || { id: 'admin', name: '平台管理员' } }, 'admin');
      await appStore.fetchState();
      uni.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/admin/console/index' });
      }, 800);
    } else {
      throw new Error('登录失败，未获取到凭证');
    }
  } catch (error) {
    // request 拦截器已提示
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
  margin-top: 100rpx;
  margin-bottom: 80rpx;

  .brand-mark {
    width: 120rpx;
    height: 120rpx;
    background: linear-gradient(135deg, #3867d6, #6b8eef);
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

.hint {
  text-align: center;
  margin-top: $spacing-md;
  color: $color-muted;
  font-size: $font-sm;
}
</style>
