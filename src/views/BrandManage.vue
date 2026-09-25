<script setup lang="ts">
import '../styles/page.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import FilterBar from '../components/FilterBar.vue'
import {
  batchDeleteBrands,
  deleteBrand,
  getBrand,
  saveBrand,
  searchBrands,
  updateBrand,
  type BrandSearchParams,
} from '../api/brand'
import type { BrandRequest, BrandVO } from '../types/api'

const loading = ref(false)
const list = ref<BrandVO[]>([])
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
const form = reactive<BrandRequest>({
  name: '',
})

const rules: Record<string, FieldRule[]> = {
  name: [{ required: true, message: '请输入品牌名称' }],
}

const resetForm = () => {
  form.name = ''
  editingId.value = null
  formRef.value?.clearValidate()
}

const buildQuery = (): BrandSearchParams => {
  const q: BrandSearchParams = {
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
    const data = await searchBrands(buildQuery())
    list.value = data.records
    total.value = data.total
  } catch (err) {
    Message.error((err as Error).message)
  } finally {
    loading.value = false
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

const openEditDialog = async (row: BrandVO) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  try {
    const detail = await getBrand(row.id as number)
    form.name = detail.name ?? ''
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
      await saveBrand({ ...form })
      Message.success('新增成功')
    } else if (editingId.value !== null) {
      await updateBrand(editingId.value, { ...form })
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
    await deleteBrand(id)
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
    title: '确认删除该品牌？',
    content: '此操作将删除该品牌。注意：若该品牌下仍关联商品，无法删除。',
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
    content: `即将删除已选的 ${ids.length} 个品牌。品牌下存在商品时无法删除。删除后可通过操作日志撤回`,
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await batchDeleteBrands(ids)
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
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">品牌管理</div>
      <div class="page-subtitle">维护球鞋品牌信息，品牌下存在商品时无法删除</div>
    </div>

    <FilterBar>
      <a-input
        v-model="searchKeyword"
        class="filter-item"
        placeholder="搜索品牌名称"
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
      <a-button type="primary" class="create-btn" @click="openCreateDialog">+ 新增品牌</a-button>
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
        :scroll="{ x: '100%', minWidth: 720 }"
        no-data-element="暂无品牌"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
        @selection-change="onSelectionChange"
      >
        <template #columns>
          <a-table-column title="ID" data-index="id" :width="80" />
          <a-table-column title="品牌名称" data-index="name" :min-width="200" ellipsis tooltip />
          <a-table-column title="创建日期" :width="140">
            <template #cell="{ record }">{{ (record as BrandVO).createTime ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="更新日期" :width="140">
            <template #cell="{ record }">{{ (record as BrandVO).updateTime ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="140" fixed="right">
            <template #cell="{ record }">
              <a-space :size="4">
                <a-button type="text" size="small" @click="openEditDialog(record as BrandVO)">编辑</a-button>
                <a-button
                  type="text"
                  status="danger"
                  size="small"
                  @click="confirmAndDelete((record as BrandVO).id as number)"
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
      :title="dialogMode === 'create' ? '新增品牌' : '编辑品牌'"
      :width="480"
      :mask-closable="false"
      unmount-on-close
      @before-ok="submitForm"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-form-item label="品牌名称" field="name">
          <a-input v-model="form.name" placeholder="如 Nike" :max-length="255" show-word-limit />
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
