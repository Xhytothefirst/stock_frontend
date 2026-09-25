export interface Result<T> {
  code: number
  msg: string
  data: T
}

export interface PageResult<T> {
  total: number
  pages: number
  current: number
  size: number
  records: T[]
}

export interface EnumOption {
  code: number
  name: string
}

export interface ProductSummaryVO {
  totalProductCount: number
  totalPurchasePrice: number
}

export interface ProductTrendDayVO {
  date: string | null
  productCount: number | null
  saleProductCount: number | null
  profit: number | null
}

export interface ProductTrendPeriodVO {
  totalProductCount: number | null
  totalSaleProductCount: number | null
  totalProfit: number | null
  dataOfDay: ProductTrendDayVO[]
}

export interface ProductWarnVO {
  thirtyDayCount: number
  sixtyDayCount: number
  ninetyDayCount: number
  overNinetyDayCount: number
}

export interface ProductDistributionVO {
  priceLevel: string
  count: number
  percent: number
}

export interface ProductVO {
  id: number
  code: string
  name: string
  purchasePrice: number | null
  number: number | null
  size: string | null
  salePrice: number | null
  profit: number | null
  platform: number | null
  createTime: string | null
  status: number | null
  brandId: number | null
  brandName: string | null
}

export interface ProductRequest {
  code: string
  name: string
  purchasePrice: number
  number: number
  size: string
  platform: number
  brandId: number | null
}

export interface OperationLogVO {
  id: number
  operationType: number
  productId: number
  productCode: string | null
  productName: string | null
  productSize: string | null
  productNumber: number | null
  productPurchasePrice: number | null
  productSalePrice: number | null
  productProfit: number | null
  createTime: string | null
}

export interface BrandVO {
  id: number | null
  name: string | null
  createTime: string | null
  updateTime: string | null
}

export interface BrandRequest {
  name: string
}

export interface LoginRequest {
  username: string
  password: string
  rememberMe: boolean
}

export interface RegisterRequest {
  username: string
  fullName: string
  password: string
  email: string
  captcha: string
}

export interface PasswordUpdateRequest {
  captcha: string
  newPassword: string
}

export interface EmailUpdateRequest {
  captcha: string
  newEmail: string
}

export interface PermissionVO {
  id: number
  code: string
  name: string
}

export interface RoleVO {
  id: number | null
  name: string | null
  description: string | null
  userCount: number | null
  permissions: PermissionVO[] | null
  createTime: string | null
  updateTime: string | null
}

export interface RoleRequest {
  name: string
  description?: string | null
  permissionIds: number[]
}

export interface UserVO {
  id: number | null
  username: string | null
  fullName: string | null
  email: string | null
  enabled: boolean | null
  roles: RoleVO[] | null
  /** 当前登录用户是否可修改该账号；自己的账号恒为 false */
  modifiable: boolean
  createTime: string | null
  updateTime: string | null
}

export interface AccountRequest {
  username: string
  fullName: string
  password: string | null
  email?: string | null
  enabled: boolean
  roleIds: number[]
}