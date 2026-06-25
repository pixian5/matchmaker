<template>
  <view class="vip-container">
    <view class="vip-card">
      <view class="card-header">
        <text class="title">VIP 会员尊享</text>
        <text class="status" v-if="userStore.vipActive">
          有效期至: {{ formatDate(userStore.vipExpiresAt) }}
        </text>
        <text class="status inactive" v-else>未开通</text>
      </view>
      <view class="privilege-list">
        <view class="privilege-item">
          <text class="icon">✓</text>
          <text class="text">查看心仪嘉宾微信号</text>
        </view>
        <view class="privilege-item">
          <text class="icon">✓</text>
          <text class="text">不限次数发起牵线申请</text>
        </view>
        <view class="privilege-item">
          <text class="icon">✓</text>
          <text class="text">尊享红娘一对一专属服务</text>
        </view>
      </view>
    </view>
    
    <view class="redeem-section">
      <text class="section-title">兑换 VIP</text>
      <view class="input-group">
        <input class="code-input" v-model="promoCode" placeholder="请输入兑换码" />
        <button class="btn-redeem" @click="handleRedeem" :class="{ disabled: loading || !promoCode }">
          {{ loading ? '兑换中' : '立即兑换' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { redeemVipApi } from '@/api/client';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const promoCode = ref('');
const loading = ref(false);

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const handleRedeem = async () => {
  if (!promoCode.value) return;
  loading.value = true;
  try {
    await redeemVipApi({ code: promoCode.value });
    uni.showToast({ title: '兑换成功', icon: 'success' });
    promoCode.value = '';
    userStore.fetchProfile();
  } catch (error) {
    //
  } finally {
    loading.value = false;
  }
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.vip-container {
  min-height: 100vh;
  padding: $spacing-md;
}

.vip-card {
  background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
  background: linear-gradient(135deg, #fff9e6 0%, #f5e3b5 100%);
  border-radius: $radius-lg;
  padding: $spacing-lg;
  box-shadow: $shadow-card;
  margin-bottom: $spacing-xl;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-md;
    
    .title {
      font-size: $font-xl;
      font-weight: bold;
      color: $color-gold;
    }
    
    .status {
      font-size: $font-sm;
      color: $color-ink;
      
      &.inactive {
        color: $color-muted;
      }
    }
  }
  
  .privilege-list {
    .privilege-item {
      display: flex;
      align-items: center;
      margin-bottom: $spacing-sm;
      
      .icon {
        color: $color-gold;
        margin-right: $spacing-sm;
        font-weight: bold;
      }
      
      .text {
        font-size: $font-base;
        color: $color-ink;
      }
    }
  }
}

.redeem-section {
  background: $color-panel;
  padding: $spacing-lg;
  border-radius: $radius-md;
  box-shadow: $shadow-card;
  
  .section-title {
    display: block;
    font-size: $font-lg;
    font-weight: bold;
    margin-bottom: $spacing-md;
    color: $color-ink;
  }
  
  .input-group {
    display: flex;
    gap: $spacing-sm;
    
    .code-input {
      flex: 1;
      height: 88rpx;
      background: $color-paper;
      border: 2rpx solid $color-line;
      border-radius: $radius-md;
      padding: 0 $spacing-md;
      font-size: $font-base;
      
      &:focus {
        border-color: $color-gold;
      }
    }
    
    .btn-redeem {
      width: 200rpx;
      height: 88rpx;
      background: $color-gold;
      color: #fff;
      border-radius: $radius-md;
      font-size: $font-base;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      
      &::after {
        border: none;
      }
      
      &.disabled {
        opacity: 0.5;
      }
      
      &:active {
        background: darken($color-gold, 10%);
      }
    }
  }
}
</style>
