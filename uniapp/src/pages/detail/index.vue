<template>
  <view class="detail-container" v-if="profile">
    <view class="photo-section">
      <image class="main-photo" :src="profile.photo || profile.avatar || '/static/default-avatar.png'" mode="aspectFill" />
      <view class="photo-mask"></view>
    </view>
    
    <view class="info-card basic-info">
      <view class="header">
        <text class="name">{{ profile.name }}</text>
        <view v-if="profile.vip" class="vip-badge">VIP</view>
      </view>
      <view class="tags">
        <text class="tag">{{ profile.age }}岁</text>
        <text class="tag">{{ profile.city }}</text>
        <text class="tag">{{ profile.job }}</text>
      </view>
    </view>
    
    <view class="info-card">
      <view class="section-title">自我介绍</view>
      <text class="section-content">{{ profile.bio || '未填写' }}</text>
    </view>
    
    <view class="info-card">
      <view class="section-title">择偶要求</view>
      <text class="section-content">{{ profile.requirements || '未填写' }}</text>
    </view>
    
    <view class="info-card">
      <view class="section-title">联系方式</view>
      <text class="section-content" v-if="profile.wechat">{{ profile.wechat }}</text>
      <text class="section-content lock-text" v-else>VIP会员可见对方微信号</text>
    </view>
    
    <view class="bottom-action safe-area-bottom">
      <button class="btn-primary" @click="handleMatchRequest" :class="{ disabled: requesting }">
        {{ requesting ? '申请中...' : '申请牵线' }}
      </button>
    </view>
  </view>
  <view v-else-if="loading" class="loading-wrapper">
    加载中...
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { getProfileDetailApi, createMatchRequestApi } from '@/api/client';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const profile = ref(null);
const loading = ref(true);
const requesting = ref(false);

onLoad((options) => {
  if (options.id) {
    loadProfile(options.id);
  }
});

const loadProfile = async (id) => {
  try {
    const res = await getProfileDetailApi(id);
    profile.value = res.data?.user || res.data || res;
  } catch (error) {
    // handled by interceptor
  } finally {
    loading.value = false;
  }
};

const handleMatchRequest = async () => {
  if (!userStore.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/index' });
    return;
  }
  if (!userStore.vipActive) {
    uni.showModal({
      title: '提示',
      content: '申请牵线需要VIP会员身份',
      confirmText: '开通VIP',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: '/pages/vip/index' });
        }
      }
    });
    return;
  }
  
  uni.showModal({
    title: '确认申请',
    content: `确定要向${profile.value.name}发起牵线申请吗？`,
    success: async (res) => {
      if (res.confirm) {
        requesting.value = true;
        try {
          await createMatchRequestApi({ targetUserId: profile.value.id });
          uni.showToast({ title: '申请成功', icon: 'success' });
        } catch (error) {
          // handled
        } finally {
          requesting.value = false;
        }
      }
    }
  });
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.detail-container {
  min-height: 100vh;
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}

.photo-section {
  position: relative;
  width: 100%;
  height: 600rpx;
  
  .main-photo {
    width: 100%;
    height: 100%;
  }
  
  .photo-mask {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 200rpx;
    background: linear-gradient(to bottom, rgba(238,242,245,0), rgba(238,242,245,1));
  }
}

.info-card {
  margin: -40rpx $spacing-md $spacing-md;
  background: $color-panel;
  border-radius: $radius-md;
  padding: $spacing-md;
  position: relative;
  z-index: 2;
  box-shadow: $shadow-card;
  
  &.basic-info {
    margin-top: -80rpx;
  }

  .header {
    display: flex;
    align-items: center;
    margin-bottom: $spacing-sm;
    
    .name {
      font-size: $font-title;
      font-weight: bold;
      color: $color-ink;
      margin-right: $spacing-sm;
    }
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: $spacing-xs;
    
    .tag {
      font-size: $font-sm;
      color: $color-muted;
      background: $color-bg;
      padding: 6rpx 16rpx;
      border-radius: $radius-sm;
    }
  }

  .section-title {
    font-size: $font-lg;
    font-weight: bold;
    color: $color-ink;
    margin-bottom: $spacing-sm;
  }

  .section-content {
    font-size: $font-base;
    color: $color-muted;
    line-height: 1.6;
    
    &.lock-text {
      color: $color-gold;
    }
  }
}

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $color-panel;
  padding: $spacing-sm $spacing-md;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  z-index: 10;
}
</style>
