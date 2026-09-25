<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import { logout } from './api/auth'
import { clearToken } from './utils/token'

const route = useRoute()
const router = useRouter()
const activeMenu = computed(() => [route.path])
const isPlainLayout = computed(() => route.meta.layout === 'plain')

const onMenuClick = (key: string | number) => {
  router.push(String(key))
}

const onLogout = () => {
  Modal.confirm({
    title: '退出登录',
    content: '确认退出当前账号？',
    okText: '退出',
    cancelText: '取消',
    onOk: async () => {
      try {
        await logout()
      } catch (err) {
        Message.error((err as Error).message)
      } finally {
        clearToken()
        Message.success('已退出登录')
        router.replace('/login')
      }
    },
  })
}
</script>

<template>
  <router-view v-if="isPlainLayout" />

  <a-layout v-else class="app-layout">
    <a-layout-header class="app-header">
      <div class="app-logo">STOCK</div>
      <a-dropdown @select="onLogout">
        <a-avatar :size="32" class="app-avatar" />
        <template #content>
          <a-doption value="logout">退出登录</a-doption>
        </template>
      </a-dropdown>
    </a-layout-header>

    <a-layout class="app-body">
      <a-layout-sider :width="200" class="app-sider">
        <a-menu :selected-keys="activeMenu" @menu-item-click="onMenuClick">
          <a-menu-item key="/">库存总览</a-menu-item>
          <a-menu-item key="/inbound">入库管理</a-menu-item>
          <a-menu-item key="/brand">品牌管理</a-menu-item>
          <a-menu-item key="/log">操作日志</a-menu-item>
          <a-menu-item key="/settings">系统设置</a-menu-item>
          <a-sub-menu key="permission">
            <template #title>权限管理</template>
            <a-menu-item key="/role">角色管理</a-menu-item>
            <a-menu-item key="/account">账号管理</a-menu-item>
          </a-sub-menu>
        </a-menu>
      </a-layout-sider>

      <a-layout class="app-main-wrap">
        <a-layout-content class="app-content">
          <router-view v-slot="{ Component }">
            <component :is="Component" class="page-view" />
          </router-view>
        </a-layout-content>

        <a-layout-footer class="app-footer">
          <a-typography-text type="secondary">Stock Frontend</a-typography-text>
        </a-layout-footer>
      </a-layout>
    </a-layout>
  </a-layout>
</template>

<style scoped>
.app-layout {
  height: 100vh;
}

.app-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border-2);
  background: var(--color-bg-2);
}

.app-logo {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--color-text-1);
}

.app-avatar {
  cursor: pointer;
  background: var(--color-fill-3);
  color: var(--color-text-2);
}

.app-body {
  flex: 1;
  min-height: 0;
}

.app-sider {
  border-right: 1px solid var(--color-border-2);
  background: var(--color-bg-2);
}

.app-sider :deep(.arco-menu) {
  width: 100%;
}

.app-main-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.app-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 16px 16px 0;
}

.page-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.app-footer {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
}
</style>
