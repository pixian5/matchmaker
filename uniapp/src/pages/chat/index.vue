<template>
  <view class="chat-container">
    <view v-if="!userStore.isLoggedIn" class="empty-state">
      <text class="empty-text">登录后查看消息</text>
      <button class="btn-primary" style="margin-top: 40rpx; width: 200rpx;" @click="goToLogin">去登录</button>
    </view>
    
    <view class="list-container" v-else>
      <view class="chat-item" v-for="item in list" :key="item.id" @click="goToChat(item.id)">
        <image class="avatar" :src="item.otherUser?.photo || '/static/default-avatar.png'" mode="aspectFill" />
        <view class="info">
          <view class="header">
            <text class="name">{{ item.otherUser?.name || '聊天' }}</text>
            <text class="time">{{ formatDate(item.lastMessageAt || item.createdAt) }}</text>
          </view>
          <text class="preview">{{ item.lastMessagePreview || '暂无消息' }}</text>
        </view>
      </view>
      
      <view v-if="loading" class="loading-wrapper">加载中...</view>
      <view v-else-if="list.length === 0" class="empty-state">
        <text class="empty-text">暂无消息</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onUnmounted } from 'vue';
import { getChatThreadsApi } from '@/api/chat';
import { useUserStore } from '@/store/user';
import { onShow, onHide } from '@dcloudio/uni-app';

const userStore = useUserStore();
const list = ref([]);
const loading = ref(false);
let pollTimer = null;

const POLL_INTERVAL = 5000;

const loadData = async () => {
  if (!userStore.isLoggedIn) return;
  loading.value = true;
  try {
    const res = await getChatThreadsApi();
    list.value = res.data?.list || [];
  } catch (error) {
    //
  } finally {
    loading.value = false;
  }
};

const startPolling = () => {
  stopPolling();
  if (userStore.isLoggedIn) {
    pollTimer = setInterval(() => {
      loadData();
    }, POLL_INTERVAL);
  }
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

onShow(() => {
  loadData();
  startPolling();
});

onHide(() => {
  stopPolling();
});

onUnmounted(() => {
  stopPolling();
});

const goToLogin = () => {
  uni.navigateTo({ url: '/pages/login/index' });
};

const goToChat = (id) => {
  uni.navigateTo({ url: `/pages/chat-detail/index?threadId=${id}` });
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
</script>

<style lang="scss" scoped>
@import '@/styles/variables.scss';

.chat-container {
  min-height: 100vh;
  background: $color-panel;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: $spacing-md $spacing-lg;
  border-bottom: 1rpx solid $color-line;
  
  &:active {
    background: $color-paper;
  }
  
  .avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    margin-right: $spacing-md;
    background: $color-bg;
  }
  
  .info {
    flex: 1;
    overflow: hidden;
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8rpx;
      
      .name {
        font-size: $font-lg;
        font-weight: bold;
        color: $color-ink;
      }
      
      .time {
        font-size: $font-xs;
        color: $color-muted;
      }
    }
    
    .preview {
      font-size: $font-sm;
      color: $color-muted;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}
</style>