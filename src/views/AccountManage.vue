<script setup lang="ts">
import '../styles/page.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import FilterBar from '../components/FilterBar.vue'
import {
  deleteAccount,
  getAccount,
  saveAccount,
  searchAccounts,
  updateAccount,
  type AccountSearchParams,
} from '../api/account'
import { listAllRoles } from '../api/role'
import type { AccountRequest, UserVO, RoleVO } from '../types/api'

const loading = ref(false)
const list = ref<UserVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

// 搜索条件
const searchUsername = ref('')
const searchFullName = ref('')
const searchRoleId = ref<number | undefined>(undefined)
const searchEnabled = ref<boolean | undefined>(undefined)

// 角色下拉选项（搜索 & 表单共用）
const roleOptions = ref<RoleVO[]>([])

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance | null>(null)
const form = reactive<AccountRequest>({
  username: '',
  fullName: '',
  password: '',
  email: '',
  enabled: true,
  roleIds: [],
})

const rules: Record<string, FieldRule[]> = {
  username: [{ required: true, message: '请输入用户名' }],
  fullName: [{ required: true, message: '请输入姓名' }],
  roleIds: [{ required: true, type: 'array', message: '请至少选择一个角色' }],
}

const resetForm = () => {
  form.username = ''
  form.fullName = ''
  form.password = ''
  form.email = ''
  form.enabled = true
  form.roleIds = []
  editingId.value = null
  formRef.value?.clearValidate()
}

const buildQuery = (): AccountSearchParams => {
  const q: AccountSearchParams = {
    page: page.value,
    pageSize: pageSize.value,
  }
  const u = searchUsername.value.trim()
  if (u) q.username = u
  const f = searchFullName.value.trim()
  if (f) q.fullName = f
  if (searchRoleId.value !== undefined) q.roleId = searchRoleId.value
  if (searchEnabled.value !== undefined) q.enabled = searchEnabled.value
  return q
}

const fetchList = async () => {
  loading.value = true
  try {
    const data = await searchAccounts(buildQuery())
    list.value = data.records
    total.value = data.total
  } catch (err) {
    Message.error((err as Error).message)
  } finally {
    loading.value = false
  }
}

const fetchRoles = async () => {
  try {
    roleOptions.value = await listAllRoles()
  } catch (err) {
    Message.error((err as Error).message)
  }
}

const onSearch = () => {
  page.value = 1
  void fetchList()
}

const onReset = () => {
  searchUsername.value = ''
  searchFullName.value = ''
  searchRoleId.value = undefined
  searchEnabled.value = undefined
  page.value = 1
  void fetchList()
}

const onPageChange = (p: number) => {
  page.value = p
  void fetchList()
}

const onPageSizeChange = (s: number) => {
  pageSize.value = s
  page.value = 1
  void fetchList()
}

const pagination = computed(() => ({
  total: total.value,
  current: page.value,
  pageSize: pageSize.value,
  showTotal: true,
  showPageSize: true,
  pageSizeOptions: [10, 20, 50],
}))

const openCreateDialog = () => {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

const openEditDialog = async (row: UserVO) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  try {
    const detail = await getAccount(row.id as number)
    form.username = detail.username ?? ''
    form.fullName = detail.fullName ?? ''
    form.password = '' // 编辑时留空表示不修改
    form.email = detail.email ?? ''
    form.enabled = detail.enabled ?? true
    form.roleIds = (detail.roles ?? []).map((r) => r.id).filter((id): id is number => id !== null)
    dialogVisible.value = true
  } catch (err) {
    Message.error((err as Error).message)
  }
}

const submitForm = async () => {
  const errors = await formRef.value?.validate()
  if (errors) return false
  if (dialogMode.value === 'create' && !form.password) {
    Message.warning('请输入密码')
    return false
  }
  try {
    const payload: AccountRequest = {
      username: form.username,
      fullName: form.fullName,
      password: form.password || null,
      email: form.email || null,
      enabled: form.enabled,
      roleIds: [...form.roleIds],
    }
    if (dialogMode.value === 'create') {
      await saveAccount(payload)
      Message.success('新增成功')
    } else if (editingId.value !== null) {
      await updateAccount(editingId.value, payload)
      Message.success('更新成功')
    }
    dialogVisible.value = false
    await fetchList()
    return true
  } catch (err) {
    Message.error((err as Error).message)
    return false
  }
}

const confirmAndDelete = (row: UserVO) => {
  Modal.confirm({
    title: '确认删除',
    content: `确认删除账号「${row.username}」？`,
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await deleteAccount(row.id as number)
        Message.success('删除成功')
        if (list.value.length === 1 && page.value > 1) {
          page.value -= 1
        }
        await fetchList()
      } catch (err) {
        Message.error((err as Error).message)
      }
    },
  })
}

onMounted(() => {
  void fetchRoles()
  void fetchList()
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">账号管理</div>
      <div class="page-subtitle">维护登录账号及其角色</div>
    </div>

    <FilterBar>
      <a-input
        v-model="searchUsername"
        class="filter-item"
        placeholder="用户名"
        allow-clear
        @keyup.enter="onSearch"
      />
      <a-input
        v-model="searchFullName"
        class="filter-item"
        placeholder="姓名"
        allow-clear
        @keyup.enter="onSearch"
      />
      <a-select v-model="searchRoleId" class="filter-item" placeholder="角色" allow-clear allow-search>
        <a-option
          v-for="role in roleOptions"
          :key="role.id ?? ''"
          :label="role.name ?? ''"
          :value="role.id ?? 0"
        />
      </a-select>
      <a-select v-model="searchEnabled" class="filter-item" placeholder="状态" allow-clear>
        <a-option label="启用" :value="true" />
        <a-option label="停用" :value="false" />
      </a-select>
      <template #actions>
        <a-button type="primary" @click="onSearch">查询</a-button>
        <a-button @click="onReset">重置</a-button>
      </template>
    </FilterBar>

    <div class="batch-toolbar">
      <a-button type="primary" class="create-btn" @click="openCreateDialog">+ 新增账号</a-button>
    </div>

    <div class="table-wrap">
      <a-table
        :data="list"
        :loading="loading"
        :stripe="true"
        :bordered="{ cell: true }"
        :pagination="pagination"
        row-key="id"
        :scroll="{ x: '100%', minWidth: 900 }"
        no-data-element="暂无账号"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="80" />
          <a-table-column title="用户名" data-index="username" :min-width="120" ellipsis tooltip />
          <a-table-column title="姓名" data-index="fullName" :min-width="120" ellipsis tooltip />
          <a-table-column title="角色" :min-width="180">
            <template #cell="{ record }">
              <template v-if="((record as UserVO).roles ?? []).length > 0">
                <a-tag v-for="role in (record as UserVO).roles" :key="role.id ?? ''" color="gray">
                  {{ role.name }}
                </a-tag>
              </template>
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="邮箱" :min-width="180">
            <template #cell="{ record }">{{ (record as UserVO).email || '—' }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="90">
            <template #cell="{ record }">
              <a-tag :color="(record as UserVO).enabled ? 'green' : 'red'">
                {{ (record as UserVO).enabled ? '启用' : '停用' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="创建时间" :width="160">
            <template #cell="{ record }">{{ (record as UserVO).createTime ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="140" fixed="right">
            <template #cell="{ record }">
              <a-space :size="4">
                <a-button
                  type="text"
                  size="small"
                  :disabled="!(record as UserVO).modifiable"
                  @click="openEditDialog(record as UserVO)"
                >
                  编辑
                </a-button>
                <a-button
                  type="text"
                  status="danger"
                  size="small"
                  :disabled="!(record as UserVO).modifiable"
                  @click="confirmAndDelete(record as UserVO)"
                >
                  删除
                </a-button>
              </a-space>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:visible="dialogVisible"
      :title="dialogMode === 'create' ? '新增账号' : '编辑账号'"
      :width="520"
      :mask-closable="false"
      unmount-on-close
      @before-ok="submitForm"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="用户名" field="username">
          <a-input v-model="form.username" placeholder="登录用户名" :max-length="255" show-word-limit />
        </a-form-item>
        <a-form-item label="姓名" field="fullName">
          <a-input v-model="form.fullName" placeholder="请输入姓名" :max-length="255" show-word-limit />
        </a-form-item>
        <a-form-item label="密码" field="password">
          <a-input-password
            v-model="form.password"
            :placeholder="dialogMode === 'edit' ? '留空表示不修改密码' : '请输入密码'"
          />
        </a-form-item>
        <a-form-item label="邮箱" field="email">
          <a-input :model-value="form.email ?? ''" placeholder="可选" @update:model-value="form.email = $event || null" />
        </a-form-item>
        <a-form-item label="状态" field="enabled">
          <a-switch v-model="form.enabled" />
        </a-form-item>
        <a-form-item label="角色" field="roleIds">
          <a-select v-model="form.roleIds" multiple placeholder="可多选" allow-clear>
            <a-option
              v-for="role in roleOptions"
              :key="role.id ?? ''"
              :label="role.name ?? ''"
              :value="role.id ?? 0"
            />
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.create-btn {
  margin-left: auto;
}

.table-wrap {
  flex: 1;
  min-height: 0;
  margin-top: 16px;
}
</style>
