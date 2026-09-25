<script setup lang="ts">
import '../styles/page.css'
import { computed, onMounted, ref } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import FilterBar from '../components/FilterBar.vue'
import { searchLogs, undoLog, type LogSearchParams } from '../api/operationLog'
import { getOperationTypes } from '../api/enum'
import type { EnumOption, OperationLogVO } from '../types/api'

const loading = ref(false)
const list = ref<OperationLogVO[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const operationTypes = ref<EnumOption[]>([])
const operationTypeMap = computed(() => {
  const m = new Map<number, string>()
  operationTypes.value.forEach((t) => m.set(t.code, t.name))
  return m
})

const codeKeyword = ref<string>('')
const nameKeyword = ref<string>('')
const typeFilter = ref<number | undefined>(undefined)
const searchTimer = ref<number | null>(null)

const typeTagColor = (code: number): string => {
  if (code === 1) return 'arcoblue'
  if (code === 2) return 'green'
  return 'red'
}

const fetchEnums = async () => {
  operationTypes.value = await getOperationTypes()
}

const fetchList = async () => {
  loading.value = true
  try {
    const params: LogSearchParams = { page: page.value, pageSize: pageSize.value }
    if (typeFilter.value !== null && typeFilter.value !== undefined) {
      params.type = typeFilter.value
    }
    const code = codeKeyword.value.trim()
    const name = nameKeyword.value.trim()
    if (code) params.productCode = code
    if (name) params.productName = name
    const data = await searchLogs(params)
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

const onTypeChange = () => {
  page.value = 1
  void fetchList()
}

const onResetFilters = () => {
  codeKeyword.value = ''
  nameKeyword.value = ''
  typeFilter.value = undefined
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

const refresh = () => {
  void fetchList()
}

const formatMoney = (n: number | null | undefined) =>
  `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const operationTimeText = (row: OperationLogVO) => row.createTime ?? '—'

const profitOf = (row: OperationLogVO): number | null => {
  if (row.productProfit === null || row.productProfit === undefined) return null
  return row.productProfit
}

const canUndo = (row: OperationLogVO): boolean => {
  const code = row.operationType
  return code === 2 || code === 3
}

const undoLabel = (row: OperationLogVO): string => {
  const code = row.operationType
  if (code === 2) return '撤回已售'
  if (code === 3) return '撤回删除'
  return ''
}

const handleUndo = async (row: OperationLogVO) => {
  try {
    await undoLog(row.id)
    Message.success('已撤回')
    await fetchList()
  } catch (err) {
    Message.error((err as Error).message)
  }
}

const confirmAndUndo = (row: OperationLogVO) => {
  Modal.confirm({
    title: '确认撤回该操作？',
    content: '此操作将还原该日志对应的影响（如恢复已售状态、恢复已删除记录）',
    okText: '撤回',
    cancelText: '取消',
    onOk: () => handleUndo(row),
  })
}

onMounted(async () => {
  await fetchEnums()
  await fetchList()
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">操作日志</div>
      <div class="page-subtitle">保留删除记录，并支持撤回误删</div>
    </div>

    <FilterBar>
      <a-input
        v-model="codeKeyword"
        class="filter-item"
        placeholder="搜索货号"
        allow-clear
        @input="onSearchInput"
        @clear="onSearchInput"
      />
      <a-input
        v-model="nameKeyword"
        class="filter-item"
        placeholder="搜索鞋款"
        allow-clear
        @input="onSearchInput"
        @clear="onSearchInput"
      />
      <a-select
        v-model="typeFilter"
        class="filter-item"
        placeholder="操作类型"
        allow-clear
        @change="onTypeChange"
      >
        <a-option v-for="opt in operationTypes" :key="opt.code" :label="opt.name" :value="opt.code" />
      </a-select>
      <template #actions>
        <a-button @click="onResetFilters">重置</a-button>
        <a-button type="primary" @click="refresh">刷新</a-button>
      </template>
    </FilterBar>

    <div class="table-wrap">
      <a-table
        :data="list"
        :loading="loading"
        :stripe="true"
        :bordered="{ cell: true }"
        :pagination="pagination"
        row-key="id"
        :scroll="{ x: '100%', minWidth: 1100 }"
        no-data-element="暂无操作日志"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
      >
        <template #columns>
          <a-table-column title="操作时间" :width="140">
            <template #cell="{ record }">{{ operationTimeText(record as OperationLogVO) }}</template>
          </a-table-column>
          <a-table-column title="操作类型" :width="120">
            <template #cell="{ record }">
              <a-tag
                v-if="(record as OperationLogVO).operationType !== null && (record as OperationLogVO).operationType !== undefined"
                :color="typeTagColor((record as OperationLogVO).operationType)"
                size="small"
              >
                {{ operationTypeMap.get((record as OperationLogVO).operationType) ?? '—' }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="鞋款" :min-width="220">
            <template #cell="{ record }">
              <span class="product-name">{{ (record as OperationLogVO).productName ?? '—' }}</span>
            </template>
          </a-table-column>
          <a-table-column title="货号 / 尺码" :min-width="200">
            <template #cell="{ record }">
              <span>
                {{ (record as OperationLogVO).productCode ?? '—' }}
                <template v-if="(record as OperationLogVO).productSize">
                  · {{ (record as OperationLogVO).productSize }} 码
                </template>
              </span>
            </template>
          </a-table-column>
          <a-table-column title="成本" :width="140">
            <template #cell="{ record }">
              <span v-if="(record as OperationLogVO).productPurchasePrice !== null && (record as OperationLogVO).productPurchasePrice !== undefined">
                {{ formatMoney((record as OperationLogVO).productPurchasePrice) }}
              </span>
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="售价" :width="140">
            <template #cell="{ record }">
              <span v-if="(record as OperationLogVO).productSalePrice !== null && (record as OperationLogVO).productSalePrice !== undefined">
                {{ formatMoney((record as OperationLogVO).productSalePrice) }}
              </span>
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="数量" :width="100">
            <template #cell="{ record }">
              <span v-if="(record as OperationLogVO).productNumber !== null && (record as OperationLogVO).productNumber !== undefined">
                {{ (record as OperationLogVO).productNumber }} 双
              </span>
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="利润" :width="120">
            <template #cell="{ record }">
              <span v-if="profitOf(record as OperationLogVO) !== null">
                {{ formatMoney(profitOf(record as OperationLogVO)) }}
              </span>
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="操作" :width="140" fixed="right">
            <template #cell="{ record }">
              <a-button
                type="text"
                size="small"
                :disabled="!canUndo(record as OperationLogVO)"
                @click="confirmAndUndo(record as OperationLogVO)"
              >
                {{ undoLabel(record as OperationLogVO) || '—' }}
              </a-button>
            </template>
          </a-table-column>
        </template>
      </a-table>
    </div>
  </div>
</template>

<style scoped>
.table-wrap {
  flex: 1;
  min-height: 0;
  margin-top: 16px;
}

.product-name {
  font-weight: 600;
}
</style>
