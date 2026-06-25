<script setup>
import { onLaunch } from "@dcloudio/uni-app";
import { useUserStore } from "./store/user";

onLaunch(() => {
  // 启动时恢复登录态
  const userStore = useUserStore();
  userStore.restoreSession();
});
</script>

<style lang="scss">
@import "./styles/global.scss";
</style>
