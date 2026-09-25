<script setup lang="ts">
import '../styles/page.css'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Message } from '@arco-design/web-vue'
import type { FieldRule, FormInstance } from '@arco-design/web-vue'
import {
  updatePassword,
  updateEmail,
  sendPasswordCaptcha,
  sendEmailCaptcha,
} from '../api/user'
import { clearToken } from '../utils/token'
import type { PasswordUpdateRequest, EmailUpdateRequest } from '../types/api'

const router = useRouter()

const visible = ref(false)
const mode = ref<'password' | 'email'>('password')
const formRef = ref<FormInstance>()
const loading = ref(false)
const countdown = ref(0)
let timer: number | undefined

const pwdForm = reactive<PasswordUpdateRequest>({ captcha: '', newPassword: '' })
const emailForm = reactive<EmailUpdateRequest>({ captcha: '', newEmail: '' })

const title = computed(() => (mode.value === 'password' ? '修改密码' : '修改邮箱'))

const rules = computed<Record<string, FieldRule[]>>(() => {
  const base: Record<string, FieldRule[]> = {
    captcha: [{ required: true, message: '请输入验证码' }],
  }
  if (mode.value === 'password') {
    base.newPassword = [
      { required: true, message: '请输入新密码' },
      { minLength: 6, message: '密码长度不少于 6 位' },
    ]
  } else {
    base.newEmail = [
      { required: true, message: '请输入新邮箱' },
      { type: 'email', message: '邮箱格式不正确' },
    ]
  }
  return base
})

const open = (m: 'password' | 'email') => {
  mode.value = m
  pwdForm.captcha = ''
  pwdForm.newPassword = ''
  emailForm.captcha = ''
  emailForm.newEmail = ''
  countdown.value = 0
  visible.value = true
}

const sendCaptcha = async () => {
  try {
    if (mode.value === 'password') await sendPasswordCaptcha()
    else await sendEmailCaptcha()
    Message.success('验证码已发送至当前邮箱')
    if (!timer) {
      timer = window.setInterval(() => {
        if (countdown.value > 0) countdown.value--
        else if (timer) {
          clearInterval(timer)
          timer = undefined
        }
      }, 1000)
    }
    countdown.value = 60
  } catch (e) {
    Message.error((e as Error).message)
  }
}

const onSubmit = async () => {
  const errors = await formRef.value?.validate()
  if (errors) return false
  loading.value = true
  try {
    if (mode.value === 'password') {
      await updatePassword(pwdForm)
      visible.value = false
      clearToken()
      Message.success('密码修改成功，请重新登录')
      router.replace('/login')
    } else {
      await updateEmail(emailForm)
      Message.success('邮箱修改成功')
      visible.value = false
    }
    return true
  } catch (e) {
    Message.error((e as Error).message)
    return false
  } finally {
    loading.value = false
  }
}

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="page-title">系统设置</div>
      <div class="page-subtitle">管理提醒与账户</div>
    </div>

    <a-card title="提醒设置" class="block" :bordered="false" />

    <a-card title="账户设置" class="block" :bordered="false">
      <a-descriptions :column="1" bordered>
        <a-descriptions-item label="登录密码">
          <a-button type="text" @click="open('password')">更改</a-button>
        </a-descriptions-item>
        <a-descriptions-item label="安全邮箱">
          <a-button type="text" @click="open('email')">更改</a-button>
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <a-modal
      v-model:visible="visible"
      :title="title"
      :width="420"
      :mask-closable="false"
      unmount-on-close
      :ok-loading="loading"
      @before-ok="onSubmit"
      @open="formRef?.clearValidate()"
    >
      <a-form
        ref="formRef"
        :model="mode === 'password' ? pwdForm : emailForm"
        :rules="rules"
        layout="vertical"
        @submit-success="onSubmit"
      >
        <a-form-item v-if="mode === 'email'" label="新邮箱" field="newEmail">
          <a-input v-model="emailForm.newEmail" placeholder="请输入新邮箱" />
        </a-form-item>
        <a-form-item v-if="mode === 'password'" label="新密码" field="newPassword">
          <a-input-password v-model="pwdForm.newPassword" placeholder="不少于 6 位" />
        </a-form-item>
        <a-form-item label="验证码" field="captcha">
          <a-input-group>
            <a-input
              v-model="(mode === 'password' ? pwdForm : emailForm).captcha"
              placeholder="当前邮箱收到的验证码"
            />
            <a-button :disabled="countdown > 0" @click="sendCaptcha">
              {{ countdown > 0 ? `${countdown}s` : '发送验证码' }}
            </a-button>
          </a-input-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.block {
  margin-bottom: 16px;
  max-width: 720px;
}
</style>
