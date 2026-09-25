<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import { checkEmail, checkUsername, login, sendSignupCaptcha, signup } from '../api/auth'
import { setToken } from '../utils/token'
import type { LoginRequest, RegisterRequest } from '../types/api'

const router = useRouter()
const activeTab = ref<'login' | 'register'>('login')

// ---------- 登录 ----------
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive<LoginRequest>({
  username: '',
  password: '',
  rememberMe: false,
})

const rules: Record<string, FieldRule[]> = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [
    { required: true, message: '请输入密码' },
    { minLength: 6, message: '密码长度不少于 6 位' },
  ],
}

const onSubmit = async () => {
  const errors = await formRef.value?.validate()
  if (errors) return
  loading.value = true
  try {
    const token = await login(form)
    setToken(token)
    Message.success('登录成功')
    router.replace('/')
  } catch (err) {
    Message.error((err as Error).message)
  } finally {
    loading.value = false
  }
}

// ---------- 注册 ----------
const registerFormRef = ref<FormInstance>()
const registerLoading = ref(false)
const countdown = ref(0)
let captchaTimer: number | undefined

const registerForm = reactive<RegisterRequest & { confirmPassword: string }>({
  username: '',
  fullName: '',
  password: '',
  email: '',
  captcha: '',
  confirmPassword: '',
})

const registerRules: Record<string, FieldRule[]> = {
  username: [
    { required: true, message: '请输入用户名' },
    {
      validator: (value, cb) => {
        const v = String(value ?? '').trim()
        if (!v) {
          cb()
          return
        }
        checkUsername(v)
          .then((available) => (available ? cb() : cb('该用户名已被注册')))
          .catch(() => cb('校验失败，请稍后重试'))
      },
    },
  ],
  fullName: [{ required: true, message: '请输入姓名' }],
  password: [
    { required: true, message: '请输入密码' },
    { minLength: 6, message: '密码长度不少于 6 位' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入密码' },
    {
      validator: (value, cb) => {
        if (value !== registerForm.password) cb('两次输入的密码不一致')
        else cb()
      },
    },
  ],
  email: [
    { required: true, message: '请输入邮箱' },
    { type: 'email', message: '邮箱格式不正确' },
    {
      validator: (value, cb) => {
        const v = String(value ?? '').trim()
        if (!v) {
          cb()
          return
        }
        checkEmail(v)
          .then((available) => (available ? cb() : cb('该邮箱已被注册')))
          .catch(() => cb('校验失败，请稍后重试'))
      },
    },
  ],
  captcha: [
    { required: true, message: '请输入验证码' },
    { length: 6, message: '验证码为 6 位数字' },
  ],
}

const stopCountdown = () => {
  if (captchaTimer !== undefined) {
    window.clearInterval(captchaTimer)
    captchaTimer = undefined
  }
}

const onSendCaptcha = async () => {
  const emailErrors = await registerFormRef.value?.validateField('email')
  if (emailErrors) return
  const email = registerForm.email?.trim()
  if (!email) {
    Message.warning('请先输入邮箱')
    return
  }
  try {
    await sendSignupCaptcha(email)
    Message.success('验证码已发送，请查收邮箱')
    countdown.value = 60
    stopCountdown()
    captchaTimer = window.setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) stopCountdown()
    }, 1000)
  } catch (err) {
    Message.error((err as Error).message)
  }
}

onBeforeUnmount(stopCountdown)

const onRegister = async () => {
  const errors = await registerFormRef.value?.validate()
  if (errors) return
  registerLoading.value = true
  try {
    await signup({
      username: registerForm.username,
      fullName: registerForm.fullName,
      password: registerForm.password,
      email: registerForm.email,
      captcha: registerForm.captcha,
    })
    Message.success('注册成功，请登录')
    form.username = registerForm.username
    registerFormRef.value?.resetFields()
    activeTab.value = 'login'
  } catch (err) {
    Message.error((err as Error).message)
  } finally {
    registerLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-title">STOCK</div>
    <a-card class="login-card" :bordered="false">
      <a-tabs v-model:active-key="activeTab" size="large">
        <a-tab-pane key="login" title="登录">
          <a-form
            ref="formRef"
            :model="form"
            :rules="rules"
            layout="vertical"
            size="large"
            @submit-success="onSubmit"
          >
            <a-form-item label="用户名" field="username">
              <a-input v-model="form.username" placeholder="请输入用户名" />
            </a-form-item>
            <a-form-item label="密码" field="password">
              <a-input-password v-model="form.password" placeholder="请输入密码" />
            </a-form-item>
            <a-form-item>
              <a-checkbox v-model="form.rememberMe">记住我</a-checkbox>
            </a-form-item>
            <a-form-item>
              <a-button type="primary" html-type="submit" long :loading="loading">登录</a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>
        <a-tab-pane key="register" title="注册">
          <a-form
            ref="registerFormRef"
            :model="registerForm"
            :rules="registerRules"
            layout="vertical"
            size="large"
            @submit-success="onRegister"
          >
            <a-form-item label="用户名" field="username" :validate-trigger="['blur']">
              <a-input v-model="registerForm.username" placeholder="登录用户名" />
            </a-form-item>
            <a-form-item label="姓名" field="fullName">
              <a-input v-model="registerForm.fullName" placeholder="请输入姓名" />
            </a-form-item>
            <a-form-item label="密码" field="password">
              <a-input-password v-model="registerForm.password" placeholder="至少 6 位" />
            </a-form-item>
            <a-form-item label="确认密码" field="confirmPassword">
              <a-input-password v-model="registerForm.confirmPassword" placeholder="再次输入密码" />
            </a-form-item>
            <a-form-item label="邮箱" field="email" :validate-trigger="['blur']">
              <a-input v-model="registerForm.email" placeholder="用于接收验证码" />
            </a-form-item>
            <a-form-item label="邮箱验证码" field="captcha" class="captcha-item">
              <a-input v-model="registerForm.captcha" placeholder="6 位验证码" :max-length="6" />
              <a-button type="outline" :disabled="countdown > 0" @click="onSendCaptcha">
                {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
              </a-button>
            </a-form-item>
            <a-form-item>
              <a-button type="primary" html-type="submit" long :loading="registerLoading">注册</a-button>
            </a-form-item>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: var(--color-fill-2);
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 4px;
  color: var(--color-text-1);
}

.login-card {
  width: 360px;
  max-width: calc(100vw - 32px);
}

.captcha-item :deep(.arco-form-item-content) {
  display: flex;
  gap: 8px;
}

.captcha-item :deep(.arco-btn) {
  flex-shrink: 0;
}
</style>
