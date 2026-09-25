<script setup lang="ts">
import '../styles/page.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import FilterBar from '../components/FilterBar.vue'
import {
  batchDeleteRoles,
  deleteRole,
  getRole,
  saveRole,
  searchRoles,
  updateRole,
  type RoleSearchParams,
} from '../api/role'
import { listAllPermissions } from '../api/permission'
import type { PermissionVO, RoleRequest, RoleVO } from '../types/api'

const loading = ref(false)
const list = ref<RoleVO[]>([])
const selectedKeys = ref<number[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const searchKeyword = ref<string>('')
const searchTimer = ref<number | null>(null)

const rowSelection = computed(() => ({
  type: 'checkbox' as const,
  showCheckedAll: true,
}))

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance | null>(null)
const form = reactive<RoleRequest>({
  name: '',
  description: '',
  permissionIds: [],
})

// 全部可选权限（来自后端，供角色编辑时勾选）
const permissionOptions = ref<PermissionVO[]>([])

const rules: Record<string, FieldRule[]> = {
  name: [{ required: true, message: '请输入角色名称' }],
}

const resetForm = () => {
  form.name = ''
  form.description = ''
  form.permissionIds = []
  editingId.value = null
  formRef.value?.clearValidate()
}

const buildQuery = (): RoleSearchParams => {
  const q: RoleSearchParams = {
    page: page.value,
    pageSize: pageSize.value,
  }
  const kw = searchKeyword.value.trim()
  if (kw) {
    q.name = kw
  }
  return q
}

const fetchList = async () => {
  loading.value = true
  try {
    const data = await searchRoles(buildQuery())
    list.value = data.records
    total.value = data.total
  } catch (err) {
    Message.error((err as Error).message)
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    permissionOptions.value = await listAllPermissions()
  } catch (err) {
    Message.error((err as Error).message)
  }
}

const onSearchInput = () => {
  if (searchTimer.value) {
    window.clearTimeout(searchTimer.value)
  }
  searchTimer.value = window.setTimeout(() => {
    page.value = 1
    void fetchList()
  }, 300)
}

const onResetFilters = () => {
  searchKeyword.value = ''
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

const openEditDialog = async (row: RoleVO) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  try {
    const detail = await getRole(row.id as number)
    form.name = detail.name ?? ''
    form.description = detail.description ?? ''
    form.permissionIds = (detail.permissions ?? []).map((p) => p.id)
    dialogVisible.value = true
  } catch (err) {
    Message.error((err as Error).message)
  }
}

const submitForm = async () => {
  const errors = await formRef.value?.validate()
  if (errors) return false
  try {
    if (dialogMode.value === 'create') {
      await saveRole({ ...form, permissionIds: [...form.permissionIds] })
      Message.success('新增成功')
    } else if (editingId.value !== null) {
      await updateRole(editingId.value, { ...form, permissionIds: [...form.permissionIds] })
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

const handleDelete = async (id: number) => {
  try {
    await deleteRole(id)
    Message.success('删除成功')
    if (list.value.length === 1 && page.value > 1) {
      page.value -= 1
    }
    await fetchList()
  } catch (err) {
    Message.error((err as Error).message)
  }
}

const confirmAndDelete = (id: number) => {
  Modal.confirm({
    title: '确认删除该角色？',
    content: '此操作将删除该角色。注意：若该角色下仍关联账号，无法删除。',
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: () => handleDelete(id),
  })
}

const onSelectionChange = (keys: (string | number)[]) => {
  selectedKeys.value = keys.map((k) => Number(k))
}

const handleBatchDelete = () => {
  const ids = selectedKeys.value
  if (ids.length === 0) return
  Modal.confirm({
    title: '批量删除确认',
    content: `即将删除已选的 ${ids.length} 个角色。角色下存在账号时无法删除。`,
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await batchDeleteRoles(ids)
        Message.success(`已删除 ${ids.length} 项`)
        selectedKeys.value = []
        if (list.value.length <= ids.length && page.value > 1) {
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
  void fetchList()
  void fetchPermissions()
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">角色管理</div>
      <div class="page-subtitle">维护角色及其权限，角色下存在账号时无法删除</div>
    </div>

    <FilterBar>
      <a-input
        v-model="searchKeyword"
        class="filter-item"
        placeholder="搜索角色名称"
        allow-clear
        @input="onSearchInput"
        @clear="onSearchInput"
      />
      <template #actions>
        <a-button @click="onResetFilters">重置</a-button>
      </template>
    </FilterBar>

    <div class="batch-toolbar">
      <a-space v-if="selectedKeys.length > 0">
        <a-button status="danger" @click="handleBatchDelete">
          批量删除 (已选 {{ selectedKeys.length }})
        </a-button>
        <a-button type="text" @click="selectedKeys = []">取消选择</a-button>
      </a-space>
      <a-button type="primary" class="create-btn" @click="openCreateDialog">+ 新增角色</a-button>
    </div>

    <div class="table-wrap">
      <a-table
        :data="list"
        :loading="loading"
        :stripe="true"
        :bordered="{ cell: true }"
        :pagination="pagination"
        row-key="id"
        :row-selection="rowSelection"
        :scroll="{ x: '100%', minWidth: 760 }"
        no-data-element="暂无角色"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
        @selection-change="onSelectionChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="80" />
          <a-table-column title="角色名称" data-index="name" :min-width="160" ellipsis tooltip />
          <a-table-column title="角色描述" :min-width="200">
            <template #cell="{ record }">{{ (record as RoleVO).description || '—' }}</template>
          </a-table-column>
          <a-table-column title="用户数量" :width="100">
            <template #cell="{ record }">{{ (record as RoleVO).userCount ?? 0 }}</template>
          </a-table-column>
          <a-table-column title="创建日期" :width="160">
            <template #cell="{ record }">{{ (record as RoleVO).createTime ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="140" fixed="right">
            <template #cell="{ record }">
              <a-space :size="4">
                <a-button type="text" size="small" @click="openEditDialog(record as RoleVO)">编辑</a-button>
                <a-button
                  type="text"
                  status="danger"
                  size="small"
                  @click="confirmAndDelete((record as RoleVO).id as number)"
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
      :title="dialogMode === 'create' ? '新增角色' : '编辑角色'"
      :width="520"
      :mask-closable="false"
      unmount-on-close
      @before-ok="submitForm"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="角色名称" field="name">
          <a-input v-model="form.name" placeholder="如 库管员" :max-length="255" show-word-limit />
        </a-form-item>
        <a-form-item label="角色描述" field="description">
          <a-input
            :model-value="form.description ?? ''"
            placeholder="可选"
            :max-length="255"
            @update:model-value="form.description = $event || null"
          />
        </a-form-item>
        <a-form-item label="权限" field="permissionIds">
          <a-checkbox-group v-model="form.permissionIds" direction="vertical">
            <a-checkbox v-for="perm in permissionOptions" :key="perm.id" :value="perm.id">
              {{ perm.name }}
            </a-checkbox>
          </a-checkbox-group>
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
