<template>
  <view class="vip-container">
    <view class="vip-card">
      <view class="card-header">
        <text class="title">人工牵线服务</text>
        <text class="status" v-if="userStore.vipActive">
          有效期至: {{ formatDate(userStore.vipExpiresAt) }}
        </text>
        <text class="status inactive" v-else>未开通</text>
      </view>
      <view class="quota-box" v-if="userStore.vipActive && userStore.servicePlan">
        <text>本周剩余：牵线 {{ matchRemaining }} 次 · 跟进 {{ followupRemaining }} 次</text>
      </view>
      <view class="privilege-list">
        <view class="privilege-item">
          <text class="icon">✓</text>
          <text class="text">查看心仪嘉宾微信号</text>
        </view>
        <view class="privilege-item">
          <text class="icon">✓</text>
          <text class="text">按套餐获得保底推荐、牵线协调和聊天指导</text>
        </view>
        <view class="privilege-item">
          <text class="icon">✓</text>
          <text class="text">尊享红娘一对一专属服务</text>
        </view>
      </view>
    </view>
    
    <view class="redeem-section">
      <text class="section-title">购买/兑换服务包</text>
      <text class="service-copy">¥399 / 30 天；首次推荐有明确时限，不合适可申请重新匹配。</text>
      <picker mode="selector" :range="planLabels" :value="selectedPlanIndex" @change="handlePlanChange">
        <view class="plan-picker">{{ planLabels[selectedPlanIndex] }}</view>
      </picker>
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
import { ref, computed } from 'vue';
import { redeemVipApi } from '@/api/client';
import { useUserStore } from '@/store/user';

const userStore = useUserStore();
const promoCode = ref('');
const loading = ref(false);
const plans = [
  { id: 'trial_3d', label: '3天体验卡 ¥29.9' },
  { id: 'weekly', label: '周卡 ¥99' },
  { id: 'monthly', label: '月卡 ¥399' },
  { id: 'quarterly', label: '季卡 ¥999' },
];
const selectedPlanIndex = ref(2);
const planLabels = plans.map((item) => item.label);
const matchRemaining = computed(() => Math.max(0, Number(userStore.servicePlan?.weeklyMatchLimit || 5) - Number(userStore.servicePlan?.weeklyMatchUsed || 0)));
const followupRemaining = computed(() => Math.max(0, Number(userStore.servicePlan?.weeklyFollowupLimit || 5) - Number(userStore.servicePlan?.weeklyFollowupUsed || 0)));

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const handleRedeem = async () => {
  if (!promoCode.value) return;
  loading.value = true;
  try {
    await redeemVipApi({ code: promoCode.value, planId: plans[selectedPlanIndex.value].id });
    uni.showToast({ title: '兑换成功', icon: 'success' });
    promoCode.value = '';
    userStore.fetchProfile();
  } catch (error) {
    //
  } finally {
    loading.value = false;
  }
};

const handlePlanChange = (event) => {
  selectedPlanIndex.value = Number(event.detail.value || 0);
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

  .quota-box {
    padding: $spacing-sm $spacing-md;
    margin-bottom: $spacing-md;
    border-radius: $radius-md;
    color: $color-primary-dark;
    background: rgba(20, 184, 166, 0.12);
    font-size: $font-sm;
  }
  
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

  .service-copy {
    display: block;
    margin-bottom: $spacing-md;
    color: $color-muted;
    font-size: $font-sm;
  }

  .plan-picker {
    height: 80rpx;
    line-height: 80rpx;
    margin-bottom: $spacing-md;
    padding: 0 $spacing-md;
    border: 2rpx solid $color-line;
    border-radius: $radius-md;
    color: $color-ink;
    background: $color-paper;
  }
  
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
