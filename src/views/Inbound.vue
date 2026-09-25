<script setup lang="ts">
import '../styles/page.css'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Message, Modal } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import FilterBar from '../components/FilterBar.vue'
import {
  batchDeleteProducts,
  deleteProduct,
  getProduct,
  queryProductsByCode,
  saleProduct,
  saveProduct,
  searchProducts,
  updateProduct,
  type ProductSearchParams,
} from '../api/product'
import { getPlatforms, getStatuses } from '../api/enum'
import { listAllBrands } from '../api/brand'
import type { BrandVO, EnumOption, ProductRequest, ProductVO } from '../types/api'

const route = useRoute()

const platformOptions = ref<EnumOption[]>([])
const statusOptions = ref<EnumOption[]>([])
const brandOptions = ref<BrandVO[]>([])

const platformMap = computed(() => {
  const m = new Map<number, string>()
  platformOptions.value.forEach((p) => m.set(p.code, p.name))
  return m
})

const statusTagColor = (code: number): string => {
  if (code === 1) return 'green'
  if (code === 2) return 'orange'
  return 'gray'
}

const loading = ref(false)
const list = ref<ProductVO[]>([])
const selectedKeys = ref<number[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)

const codeFilter = ref<string>('')
const nameFilter = ref<string>('')
const sizeFilter = ref<string>('')
const statusFilter = ref<number | undefined>(1)
const brandFilter = ref<number | undefined>(undefined)
const costMin = ref<number | undefined>(undefined)
const costMax = ref<number | undefined>(undefined)
const dateRange = ref<[string, string] | undefined>(undefined)
const searchTimer = ref<number | null>(null)

const rowSelection = computed(() => ({
  type: 'checkbox' as const,
  showCheckedAll: true,
}))

// 货号相似商品查询（仅新增模式）
const codeSuggestTimer = ref<number | null>(null)
const codeSuggestions = ref<ProductVO[]>([])

// a-auto-complete 的搜索回调，带 1 秒防抖
const querySimilarCode = (queryString: string) => {
  // 编辑模式或空值不查询，避免覆盖正在编辑的数据
  if (dialogMode.value !== 'create' || !queryString.trim()) {
    codeSuggestions.value = []
    return
  }
  if (codeSuggestTimer.value) {
    window.clearTimeout(codeSuggestTimer.value)
  }
  codeSuggestTimer.value = window.setTimeout(() => {
    queryProductsByCode(queryString.trim())
      .then((results) => {
        codeSuggestions.value = results ?? []
      })
      .catch(() => {
        codeSuggestions.value = []
      })
  }, 1000)
}

// 选中某条相似商品 → 自动填写名称和品牌
const onSimilarCodeSelect = (value: string | number | Record<string, unknown> | undefined) => {
  const code = typeof value === 'string' ? value : String(value ?? '')
  const product = codeSuggestions.value.find((p) => p.code === code)
  if (!product) return
  form.name = product.name ?? ''
  if (product.brandId) {
    form.brandId = product.brandId
  }
  formRef.value?.clearValidate(['name', 'brandId'])
}

// 供模板插槽使用：从联想选项数据中取出商品对象（避免模板内类型断言语法）
const suggestionProduct = (data: unknown): ProductVO | null => {
  const product = (data as { product?: ProductVO } | null)?.product
  return product ?? null
}

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance | null>(null)
const form = reactive<ProductRequest>({
  code: '',
  name: '',
  purchasePrice: 0,
  number: 1,
  size: '',
  platform: 1,
  brandId: null,
})

const rules: Record<string, FieldRule[]> = {
  code: [{ required: true, message: '请输入货号' }],
  name: [{ required: true, message: '请输入鞋款名称' }],
  size: [{ required: true, message: '请输入尺码' }],
  number: [{ required: true, message: '请输入数量' }],
  purchasePrice: [{ required: true, message: '请输入成本' }],
  platform: [{ required: true, message: '请选择平台' }],
  brandId: [{ required: true, message: '请选择品牌' }],
}

// a-select 不接受 null，用计算属性做 null ↔ undefined 桥接
const brandIdModel = computed({
  get: () => form.brandId ?? undefined,
  set: (v: number | undefined) => {
    form.brandId = v ?? null
  },
})

const resetForm = () => {
  // 清除上一次货号查询的定时器，避免弹窗打开后又触发查询
  if (codeSuggestTimer.value) {
    window.clearTimeout(codeSuggestTimer.value)
    codeSuggestTimer.value = null
  }
  codeSuggestions.value = []
  form.code = ''
  form.name = ''
  form.purchasePrice = 0
  form.number = 1
  form.size = ''
  form.platform = platformOptions.value[0]?.code ?? 1
  form.brandId = null
  editingId.value = null
  formRef.value?.clearValidate()
}

const fetchLookups = async () => {
  const [platforms, statuses, brands] = await Promise.all([
    getPlatforms(),
    getStatuses(),
    listAllBrands(),
  ])
  platformOptions.value = platforms
  statusOptions.value = statuses
  brandOptions.value = brands
  if (!form.platform && platforms.length > 0) {
    form.platform = platforms[0].code
  }
}

const buildQuery = (): ProductSearchParams => {
  const q: ProductSearchParams = {
    page: page.value,
    pageSize: pageSize.value,
  }
  const code = codeFilter.value.trim()
  if (code) {
    q.code = code
  }
  const name = nameFilter.value.trim()
  if (name) {
    q.name = name
  }
  const size = sizeFilter.value.trim()
  if (size) {
    q.size = size
  }
  if (statusFilter.value !== null && statusFilter.value !== undefined) {
    q.status = statusFilter.value
  }
  if (brandFilter.value !== null && brandFilter.value !== undefined) {
    q.brandId = brandFilter.value
  }
  if (costMin.value !== undefined && costMin.value !== null) {
    q.minPurchasePrice = costMin.value
  }
  if (costMax.value !== undefined && costMax.value !== null) {
    q.maxPurchasePrice = costMax.value
  }
  if (dateRange.value && dateRange.value.length === 2) {
    q.startTime = dateRange.value[0]
    q.endTime = dateRange.value[1]
  }
  return q
}

const fetchList = async () => {
  loading.value = true
  try {
    const data = await searchProducts(buildQuery())
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

const onStatusChange = () => {
  page.value = 1
  void fetchList()
}

const onBrandChange = () => {
  page.value = 1
  void fetchList()
}

const onCostChange = () => {
  if (
    typeof costMin.value === 'number' &&
    typeof costMax.value === 'number' &&
    costMin.value > costMax.value
  ) {
    Message.warning('成本下限不能大于上限')
    return
  }
  page.value = 1
  void fetchList()
}

const onDateChange = () => {
  page.value = 1
  void fetchList()
}

const onResetFilters = () => {
  codeFilter.value = ''
  nameFilter.value = ''
  sizeFilter.value = ''
  statusFilter.value = 1
  brandFilter.value = undefined
  costMin.value = undefined
  costMax.value = undefined
  dateRange.value = undefined
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

const openEditDialog = async (row: ProductVO) => {
  dialogMode.value = 'edit'
  editingId.value = row.id
  try {
    const detail = await getProduct(row.id)
    if (brandOptions.value.length === 0) {
      await fetchLookups()
    }
    form.code = detail.code
    form.name = detail.name
    form.size = detail.size ?? ''
    form.number = detail.number ?? 1
    form.purchasePrice = Number(detail.purchasePrice ?? 0)
    form.platform = detail.platform ?? 1
    form.brandId = detail.brandId ?? null
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
      await saveProduct({ ...form })
      Message.success('入库成功')
    } else if (editingId.value !== null) {
      await updateProduct(editingId.value, { ...form })
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

const saleDialogVisible = ref(false)
const saleRowId = ref<number | null>(null)
const salePrice = ref<number>(0)
const salePurchasePrice = ref<number>(0)
const saleNumber = ref<number>(1)
const saleForm = computed(() => ({
  price: salePrice.value,
  profit: saleProfit.value,
}))
const saleProfit = computed(() =>
  (salePrice.value - salePurchasePrice.value) * saleNumber.value,
)

const openSaleDialog = (row: ProductVO) => {
  saleRowId.value = row.id
  salePrice.value = Number(row.salePrice ?? 0)
  salePurchasePrice.value = Number(row.purchasePrice ?? 0)
  saleNumber.value = Number(row.number ?? 1)
  saleDialogVisible.value = true
}

const submitSale = async () => {
  if (saleRowId.value === null) return false
  if (!salePrice.value || salePrice.value <= 0) {
    Message.warning('请填写有效的售价')
    return false
  }
  try {
    await saleProduct(saleRowId.value, salePrice.value)
    Message.success('已标记为已售')
    saleDialogVisible.value = false
    await fetchList()
    return true
  } catch (err) {
    Message.error((err as Error).message)
    return false
  }
}

const handleDelete = async (id: number) => {
  try {
    await deleteProduct(id)
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
    title: '确认删除',
    content: '此操作将删除该入库记录及其成本信息。删除后可通过操作日志撤回。',
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
    content: `即将删除已选的 ${ids.length} 条入库记录。删除后可通过操作日志撤回`,
    okText: '删除',
    cancelText: '取消',
    okButtonProps: { status: 'danger' },
    onOk: async () => {
      try {
        await batchDeleteProducts(ids)
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

const formatMoney = (n: number | null | undefined) =>
  `¥${Number(n ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const statusName = (code: number | undefined | null) => {
  if (code === undefined || code === null) return '未知'
  const found = statusOptions.value.find((s) => s.code === code)
  return found ? found.name : '未知'
}

const isNormalStatus = (row: ProductVO) => row.status === 1

const isDeletedStatus = (row: ProductVO) => row.status === 3

onMounted(async () => {
  await fetchLookups()
  await fetchList()
  if (route.query.refresh) {
    page.value = 1
    await fetchList()
  }
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">入库记录</div>
      <div class="page-subtitle">记录每次采购的球鞋和成本</div>
    </div>
    <FilterBar>
      <a-input
        v-model="codeFilter"
        class="filter-item"
        placeholder="货号"
        allow-clear
        @input="onSearchInput"
        @clear="onSearchInput"
      />
      <a-input
        v-model="nameFilter"
        class="filter-item"
        placeholder="鞋名"
        allow-clear
        @input="onSearchInput"
        @clear="onSearchInput"
      />
      <a-input
        v-model="sizeFilter"
        class="filter-item"
        placeholder="尺码"
        allow-clear
        @input="onSearchInput"
        @clear="onSearchInput"
      />
      <a-select
        v-model="statusFilter"
        class="filter-item"
        placeholder="状态"
        allow-clear
        @change="onStatusChange"
      >
        <a-option v-for="opt in statusOptions" :key="opt.code" :label="opt.name" :value="opt.code" />
      </a-select>
      <a-select
        v-model="brandFilter"
        class="filter-item"
        placeholder="品牌"
        allow-clear
        allow-search
        @change="onBrandChange"
      >
        <a-option v-for="b in brandOptions" :key="b.id ?? ''" :label="b.name ?? ''" :value="b.id ?? 0" />
      </a-select>
      <div class="filter-item-lg range-group">
        <a-input-number
          v-model="costMin"
          :min="0"
          :precision="2"
          :step="10"
          placeholder="最低成本"
          hide-button
          @change="onCostChange"
        />
        <span class="range-separator">—</span>
        <a-input-number
          v-model="costMax"
          :min="0"
          :precision="2"
          :step="10"
          placeholder="最高成本"
          hide-button
          @change="onCostChange"
        />
      </div>
      <a-range-picker
        v-model="dateRange"
        class="filter-item-lg"
        style="width: 320px"
        value-format="YYYY-MM-DD"
        :allow-clear="true"
        @change="onDateChange"
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
      <a-button type="primary" class="create-btn" @click="openCreateDialog">+ 新增入库</a-button>
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
        :scroll="{ x: '100%', minWidth: 1200 }"
        no-data-element="暂无入库记录"
        @page-change="onPageChange"
        @page-size-change="onPageSizeChange"
        @selection-change="onSelectionChange"
      >
        <template #columns>
          <a-table-column title="货号" data-index="code" :width="140" ellipsis tooltip />
          <a-table-column title="鞋款" data-index="name" :width="200" ellipsis tooltip />
          <a-table-column title="尺码" :width="80">
            <template #cell="{ record }">{{ (record as ProductVO).size ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="数量" :width="80">
            <template #cell="{ record }">{{ (record as ProductVO).number ?? 0 }} 双</template>
          </a-table-column>
          <a-table-column title="成本" :width="120">
            <template #cell="{ record }">{{ formatMoney((record as ProductVO).purchasePrice) }}</template>
          </a-table-column>
          <a-table-column title="参考售价" :width="160">
            <template #cell="{ record }">
              <template v-if="(record as ProductVO).salePrice !== null && (record as ProductVO).salePrice !== undefined">
                <div>{{ formatMoney((record as ProductVO).salePrice) }}</div>
                <div class="profit-text">利润 {{ formatMoney((record as ProductVO).profit) }}</div>
              </template>
              <span v-else>—</span>
            </template>
          </a-table-column>
          <a-table-column title="平台" :width="110">
            <template #cell="{ record }">
              <span v-if="(record as ProductVO).platform && platformMap.get((record as ProductVO).platform!)">
                {{ platformMap.get((record as ProductVO).platform!) }}
              </span>
              <span v-else>待分配</span>
            </template>
          </a-table-column>
          <a-table-column title="品牌" :width="140">
            <template #cell="{ record }">{{ (record as ProductVO).brandName ?? '未分配' }}</template>
          </a-table-column>
          <a-table-column title="状态" :width="100">
            <template #cell="{ record }">
              <a-tag
                v-if="(record as ProductVO).status !== null && (record as ProductVO).status !== undefined"
                :color="statusTagColor((record as ProductVO).status!)"
                size="small"
              >
                {{ statusName((record as ProductVO).status!) }}
              </a-tag>
            </template>
          </a-table-column>
          <a-table-column title="入库日期" :width="120">
            <template #cell="{ record }">{{ (record as ProductVO).createTime ?? '—' }}</template>
          </a-table-column>
          <a-table-column title="操作" :width="180" fixed="right">
            <template #cell="{ record }">
              <a-space :size="4">
                <a-button
                  v-if="!isDeletedStatus(record as ProductVO)"
                  type="text"
                  size="small"
                  @click="openEditDialog(record as ProductVO)"
                >
                  编辑
                </a-button>
                <a-button
                  v-if="isNormalStatus(record as ProductVO)"
                  type="text"
                  size="small"
                  @click="openSaleDialog(record as ProductVO)"
                >
                  已售
                </a-button>
                <a-button
                  v-if="!isDeletedStatus(record as ProductVO)"
                  type="text"
                  status="danger"
                  size="small"
                  @click="confirmAndDelete((record as ProductVO).id)"
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
      :title="dialogMode === 'create' ? '新增入库' : '编辑入库'"
      :width="560"
      :mask-closable="false"
      unmount-on-close
      @before-ok="submitForm"
    >
      <a-form ref="formRef" :model="form" :rules="rules" layout="horizontal" :label-col-props="{ span: 5 }" :wrapper-col-props="{ span: 19 }">
        <a-form-item label="货号" field="code">
          <a-auto-complete
            v-model="form.code"
            :data="codeSuggestions.map((p) => ({ value: p.code, label: `${p.code} ${p.name ?? ''} · ${p.brandName ?? ''}`, product: p }))"
            placeholder="如 DD1391-100"
            @search="querySimilarCode"
            @select="onSimilarCodeSelect"
          >
            <template #option="{ data }">
              <div v-if="suggestionProduct(data)" class="suggest-item">
                <div>{{ suggestionProduct(data)!.code }}</div>
                <div class="suggest-sub">
                  {{ suggestionProduct(data)!.name }} ·
                  {{ suggestionProduct(data)!.brandName }}
                </div>
              </div>
            </template>
          </a-auto-complete>
        </a-form-item>
        <a-form-item label="鞋款名称" field="name">
          <a-input v-model="form.name" placeholder="如 Air Jordan 1 Low 白灰" />
        </a-form-item>
        <a-form-item label="尺码" field="size">
          <a-input v-model="form.size" placeholder="如 42" />
        </a-form-item>
        <a-form-item label="品牌" field="brandId">
          <a-select
            :key="`brand-select-${brandOptions.length}`"
            v-model="brandIdModel"
            placeholder="请选择品牌"
            allow-search
          >
            <a-option v-for="b in brandOptions" :key="b.id ?? ''" :label="b.name ?? ''" :value="b.id ?? 0" />
          </a-select>
        </a-form-item>
        <a-form-item label="数量" field="number">
          <a-input-number v-model="form.number" :min="1" :step="1" style="width: 160px" />
        </a-form-item>
        <a-form-item label="成本" field="purchasePrice">
          <a-input-number
            v-model="form.purchasePrice"
            :min="0"
            :precision="2"
            :step="10"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="平台" field="platform">
          <a-select v-model="form.platform" placeholder="请选择平台">
            <a-option v-for="opt in platformOptions" :key="opt.code" :label="opt.name" :value="opt.code" />
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="saleDialogVisible"
      title="标记已售"
      :width="400"
      :mask-closable="false"
      unmount-on-close
      @before-ok="submitSale"
    >
      <a-form :model="saleForm" layout="horizontal" :label-col-props="{ span: 5 }" :wrapper-col-props="{ span: 19 }">
        <a-form-item label="售价">
          <a-input-number v-model="salePrice" :min="0" :precision="2" :step="10" style="width: 100%" />
        </a-form-item>
        <a-form-item label="利润">
          <span :class="saleProfit >= 0 ? 'profit-text' : 'loss-text'">{{ formatMoney(saleProfit) }}</span>
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

.table-wrap :deep(.arco-table-body) {
  min-height: 120px;
}

.profit-text {
  color: var(--color-success);
  font-size: 12px;
}

.loss-text {
  color: var(--color-danger);
}

.suggest-item {
  line-height: 1.4;
  padding: 2px 0;
}

.suggest-sub {
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
