<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Message } from '@arco-design/web-vue'
import { VueUiDonut, VueUiQuickChart } from 'vue-data-ui'
import type { VueUiDonutConfig, VueUiQuickChartConfig } from 'vue-data-ui'
import {
  getDistribution,
  getSummary,
  getTrend,
  getWarn,
  type TrendDay,
} from '../api/statistic'
import type {
  ProductDistributionVO,
  ProductSummaryVO,
  ProductTrendPeriodVO,
  ProductWarnVO,
} from '../types/api'

const activeTrend = ref<TrendDay>(90)

const summary = ref<ProductSummaryVO | null>(null)
const trend = ref<ProductTrendPeriodVO | null>(null)
const todayTrend = ref<ProductTrendPeriodVO | null>(null)
const warn = ref<ProductWarnVO | null>(null)
const distribution = ref<ProductDistributionVO[]>([])

const loadingSummary = ref(false)
const loadingTrend = ref(false)
const loadingWarn = ref(false)
const loadingDistribution = ref(false)
const globalError = ref<string>('')

// Arco 色板
const palette = ['#165DFF', '#00B42A', '#FF7D00', '#F53F3F', '#86909C', '#C9CDD4']

const distributionDataset = computed(() =>
  distribution.value.map((d) => ({
    name: d.priceLevel,
    values: [Number(d.count)],
  })),
)

const distributionConfig = ref<VueUiDonutConfig>({
  pie: false,
  responsive: true,
  theme: '',
  customPalette: palette,
  userOptions: { show: false },
  style: {
    chart: {
      title: { text: '', color: 'var(--color-text-1)' },
      legend: { show: true, position: 'top' },
      tooltip: { show: true },
      backgroundColor: 'transparent',
      layout: {
        labels: {
          hollow: {
            average: { show: false },
          },
        },
      },
    },
  },
})

const trendDayLabels = computed(() =>
  (trend.value?.dataOfDay ?? []).map((d) => d.date?.substring(5) ?? ''),
)

const purchaseLineDataset = computed<number[]>(() =>
  (trend.value?.dataOfDay ?? []).map((d) => Number(d.productCount ?? 0)),
)

const saleLineDataset = computed<number[]>(() =>
  (trend.value?.dataOfDay ?? []).map((d) => Number(d.saleProductCount ?? 0)),
)

const profitLineDataset = computed<number[]>(() =>
  (trend.value?.dataOfDay ?? []).map((d) => Number(d.profit ?? 0)),
)

const buildLineConfig = (
  color: string,
  periods: string[],
  modulo: number,
): VueUiQuickChartConfig => ({
  responsive: true,
  theme: '',
  backgroundColor: 'transparent',
  showUserOptions: false,
  showLegend: false,
  showDataLabels: false,
  showTooltip: true,
  zoomXy: false,
  title: '',
  color,
  lineSmooth: true,
  lineStrokeWidth: 2,
  lineAnimated: true,
  xyShowAxis: true,
  xyShowGrid: false,
  xyShowScale: true,
  xyScaleSegments: 4,
  xyPeriods: periods,
  xyPeriodsShowOnlyAtModulo: true,
  xyPeriodsModulo: modulo,
  xyLabelsXFontSize: 10,
  xyLabelsYFontSize: 10,
  xyPaddingTop: 8,
  xyPaddingRight: 8,
  xyPaddingBottom: 18,
  xyPaddingLeft: 32,
  tooltipFontSize: 11,
  formatter: ({ value }) => {
    const num = Number(value) || 0
    return Number.isInteger(num) ? String(num) : num.toFixed(2)
  },
})

const trendConfigs = computed(() => {
  const labels = trendDayLabels.value
  const days = trend.value?.dataOfDay?.length ?? 0
  const modulo = days > 7 ? 6 : 7
  return {
    purchase: buildLineConfig(palette[0], labels, modulo),
    sale: buildLineConfig(palette[1], labels, modulo),
    profit: buildLineConfig(palette[2], labels, modulo),
  }
})

const metrics = computed(() => [
  {
    title: '当前库存',
    numeric: Number(summary.value?.totalProductCount ?? 0),
    prefix: '',
    precision: 0,
    hint: '可售库存',
  },
  {
    title: '库存总成本',
    numeric: Number(summary.value?.totalPurchasePrice ?? 0),
    prefix: '¥',
    precision: 2,
    hint: '按入库成本计算',
  },
  {
    title: '今日入库',
    numeric: Number(todayTrend.value?.totalProductCount ?? 0),
    prefix: '',
    precision: 0,
    hint: '今日新录入（含累计至今日）',
  },
  {
    title: '今日利润',
    numeric: Number(todayTrend.value?.totalProfit ?? 0),
    prefix: '¥',
    precision: 2,
    hint: '已售订单（含累计至今日）',
  },
])

const trendMetrics = computed(() => {
  const days = activeTrend.value
  const totalProduct = Number(trend.value?.totalProductCount ?? 0)
  const totalSale = Number(trend.value?.totalSaleProductCount ?? 0)
  const totalProfit = Number(trend.value?.totalProfit ?? 0)
  return [
    {
      title: `近${days}天入库`,
      numeric: totalProduct,
      display: `${totalProduct} 双`,
      tag: 'down' as const,
      hasData: purchaseLineDataset.value.length > 0,
      dataset: purchaseLineDataset.value,
      config: trendConfigs.value.purchase,
    },
    {
      title: `近${days}天售出`,
      numeric: totalSale,
      display: `${totalSale} 双`,
      tag: 'up' as const,
      hasData: saleLineDataset.value.length > 0,
      dataset: saleLineDataset.value,
      config: trendConfigs.value.sale,
    },
    {
      title: `近${days}天利润`,
      numeric: totalProfit,
      display: `¥${totalProfit.toLocaleString('zh-CN')}`,
      tag: 'currency' as const,
      hasData: profitLineDataset.value.length > 0,
      dataset: profitLineDataset.value,
      config: trendConfigs.value.profit,
    },
  ]
})

const warnBuckets = computed(() => {
  const w = warn.value
  if (!w) {
    return []
  }
  return [
    { label: '0–30 天', count: w.thirtyDayCount },
    { label: '30–60 天', count: w.sixtyDayCount },
    { label: '60–90 天', count: w.ninetyDayCount },
    { label: '90 天以上', count: w.overNinetyDayCount },
  ]
})

const fetchSummary = async () => {
  loadingSummary.value = true
  try {
    const data = await getSummary()
    summary.value = data
  } catch (err) {
    globalError.value = (err as Error).message
  } finally {
    loadingSummary.value = false
  }
}

const fetchTrend = async (day: TrendDay) => {
  loadingTrend.value = true
  try {
    const data = await getTrend(day)
    trend.value = data
  } catch (err) {
    Message.error((err as Error).message)
  } finally {
    loadingTrend.value = false
  }
}

const fetchTodayTrend = async () => {
  try {
    const data = await getTrend(0)
    todayTrend.value = data
  } catch (err) {
    Message.error((err as Error).message)
  }
}

const fetchWarn = async () => {
  loadingWarn.value = true
  try {
    const data = await getWarn()
    warn.value = data
  } catch (err) {
    Message.error((err as Error).message)
  } finally {
    loadingWarn.value = false
  }
}

const fetchDistribution = async () => {
  loadingDistribution.value = true
  try {
    const data = await getDistribution()
    distribution.value = data
  } catch (err) {
    Message.error((err as Error).message)
  } finally {
    loadingDistribution.value = false
  }
}

const refreshAll = () => {
  globalError.value = ''
  void fetchSummary()
  void fetchTodayTrend()
  void fetchTrend(activeTrend.value)
  void fetchWarn()
  void fetchDistribution()
}

onMounted(refreshAll)

watch(activeTrend, (value) => {
  void fetchTrend(value)
})
</script>

<template>
  <div class="dashboard">
    <a-alert v-if="globalError" type="error" show-icon closable @close="globalError = ''">
      {{ globalError }}
    </a-alert>

    <a-spin :loading="loadingSummary" class="block">
      <div class="metric-grid">
        <a-card v-for="item in metrics" :key="item.title" hoverable class="metric-card">
          <div class="metric-title">{{ item.title }}</div>
          <a-statistic
            :value="item.numeric"
            :prefix="item.prefix || undefined"
            :precision="item.precision"
            :value-style="{ fontSize: '22px' }"
          />
          <div class="metric-hint">{{ item.hint }}</div>
        </a-card>
      </div>
    </a-spin>

    <a-card class="block entry-card" :bordered="false">
      <div class="entry-row">
        <div>
          <div class="entry-title">开始入库</div>
          <div class="entry-hint">新增球鞋、成本、尺码和库位</div>
        </div>
        <a-button type="primary" status="normal" @click="$router.push('/inbound')">
          立即入库
        </a-button>
      </div>
    </a-card>

    <div class="trend-row">
      <a-card class="trend-card" :bordered="false">
        <template #title>
          <div class="card-title-row">
            <div>
              <span class="card-title">经营趋势</span>
              <span class="card-subtitle">近{{ activeTrend }}天入库、售出与利润分别展示</span>
            </div>
            <a-radio-group v-model="activeTrend" type="button" size="small">
              <a-radio :value="7">7天</a-radio>
              <a-radio :value="30">30天</a-radio>
              <a-radio :value="90">90天</a-radio>
            </a-radio-group>
          </div>
        </template>
        <a-spin :loading="loadingTrend" class="trend-spin">
          <div class="trend-grid">
            <a-card v-for="item in trendMetrics" :key="item.title" class="trend-item">
              <template #title>
                <div class="trend-item-head">
                  <span class="trend-item-title">{{ item.title }}</span>
                  <a-space :size="6">
                    <a-tag v-if="item.tag === 'down'" color="gray">↓</a-tag>
                    <a-tag v-else-if="item.tag === 'up'" color="green">↑</a-tag>
                    <a-tag v-else color="orange">¥</a-tag>
                    <span class="trend-item-value">{{ item.display }}</span>
                  </a-space>
                </div>
              </template>
              <div class="trend-chart">
                <VueUiQuickChart v-if="item.hasData" :config="item.config" :dataset="item.dataset" />
                <a-empty v-else description="暂无数据" />
              </div>
            </a-card>
          </div>
        </a-spin>
      </a-card>

      <a-card class="distribution-card" :bordered="false" title="成本价位分布">
        <a-spin :loading="loadingDistribution" class="distribution-spin">
          <div class="distribution-body">
            <VueUiDonut
              v-if="distributionDataset.length > 0"
              :config="distributionConfig"
              :dataset="distributionDataset"
            />
            <a-empty v-else description="暂无分布数据" />
          </div>
        </a-spin>
      </a-card>
    </div>

    <a-card class="block" :bordered="false">
      <template #title>
        <div class="card-title-row">
          <span class="card-title">库龄预警</span>
          <a-tag color="red">超期 {{ warn?.overNinetyDayCount ?? 0 }} 双</a-tag>
        </div>
      </template>
      <a-spin :loading="loadingWarn">
        <a-descriptions :column="4" bordered>
          <a-descriptions-item v-for="bucket in warnBuckets" :key="bucket.label" :label="bucket.label">
            {{ bucket.count }} 双
          </a-descriptions-item>
        </a-descriptions>
      </a-spin>
    </a-card>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block {
  flex: none;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.metric-card :deep(.arco-card-body) {
  padding: 12px 16px;
}

.metric-title {
  color: var(--color-text-2);
  font-size: 13px;
}

.metric-hint {
  color: var(--color-success);
  font-size: 12px;
  margin-top: 4px;
}

.entry-card :deep(.arco-card-body) {
  padding: 14px 16px;
}

.entry-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.entry-title {
  font-weight: 600;
}

.entry-hint {
  color: var(--color-text-3);
  font-size: 12px;
}

.trend-row {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

.trend-card {
  flex: 2;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.trend-card :deep(.arco-card-body) {
  flex: 1;
  min-height: 0;
}

.distribution-card {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.distribution-card :deep(.arco-card-body) {
  flex: 1;
  min-height: 0;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
}

.card-subtitle {
  margin-left: 8px;
  color: var(--color-text-3);
  font-size: 12px;
}

.trend-spin,
.distribution-spin {
  display: block;
  width: 100%;
}

.trend-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.trend-item :deep(.arco-card-header) {
  padding: 8px 12px 0;
  border: none;
}

.trend-item :deep(.arco-card-body) {
  padding: 8px 12px 12px;
}

.trend-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.trend-item-title {
  font-weight: 600;
  font-size: 13px;
}

.trend-item-value {
  font-size: 14px;
  font-weight: 600;
}

.trend-chart {
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.distribution-body {
  height: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
