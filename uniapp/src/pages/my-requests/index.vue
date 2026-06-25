<template>
  <view class="requests-container">
    <view class="list-container">
      <view class="request-card" v-for="item in list" :key="item.id">
        <image class="avatar" :src="item.toUser?.photo || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="info">
          <view class="header">
            <text class="name">申请牵线：{{ item.toUser?.name || '未知' }}</text>
            <view class="status-badge" :class="getStatusClass(item.status)">
              {{ getStatusText(item.status) }}
            </view>
          </view>
          <text class="time">申请时间: {{ formatDate(item.createdAt) }}</text>
        </view>
      </view>
      
      <view v-if="loading" class="loading-wrapper">加载中...</view>
      <view v-else-if="list.length === 0" class="empty-state">
        <text class="empty-text">还没有牵线记录，去发现合适的人吧</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue';
import { getMatchRequestsApi } from '@/api/client';
import { onShow } from '@dcloudio/uni-app';

const list = ref([]);
const loading = ref(true);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await getMatchRequestsApi();
    list.value = res.data?.list || [];
  } catch (error) {
    //
  } finally {
    loading.value = false;
  }
};

onShow(() => {
  loadData();
});

const pendingStatuses = ['pending', '待红娘联系'];
const activeStatuses = ['contacted', '联系男方', '联系女方', '已联系男方', '已联系女方', '已联系双方', '来和双方对话'];
const doneStatuses = ['completed', 'rejected', '已完成', '已拒绝'];

const getStatusClass = (status) => {
  if (pendingStatuses.includes(status)) return 'status-pending';
  if (activeStatuses.includes(status)) return 'status-active';
  if (doneStatuses.includes(status)) return 'status-done';
  return 'status-pending';
};

const getStatusText = (status) => {
  if (pendingStatuses.includes(status)) return '待红娘联系';
  if (status === 'contacted') return '已联系';
  if (status === 'completed' || status === '已完成') return '已完成';
  if (status === 'rejected' || status === '已拒绝') return '已拒绝';
  if (activeStatuses.includes(status)) return status;
  return '待处理';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.requests-container {
  min-height: 100vh;
  padding: $spacing-md;
}

.request-card {
  display: flex;
  align-items: center;
  background: $color-panel;
  border-radius: $radius-md;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
  box-shadow: $shadow-card;
  
  .avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    margin-right: $spacing-md;
    background: $color-bg;
  }
  
  .info {
    flex: 1;
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: $spacing-xs;
      
      .name {
        font-size: $font-base;
        font-weight: bold;
        color: $color-ink;
      }
    }
    
    .time {
      font-size: $font-sm;
      color: $color-muted;
    }
  }
}
</style>
