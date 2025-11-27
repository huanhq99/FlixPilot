<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { getConfig, saveConfig, loginMoviePilot, testMoviePilot } from '@/api/config'

const loading = ref(false)
const saving = ref(false)
const testingMP = ref(false)
const mpStatus = ref<{ success: boolean; message: string } | null>(null)

const config = reactive({
  tmdb: { apiKey: '' },
  moviepilot: { 
    url: '', 
    username: '', 
    password: '', 
    useProxy: false 
  },
  emby: { serverUrl: '', apiKey: '' },
  telegram: { botToken: '', chatId: '' },
  proxy: { http: '', https: '' }
})

onMounted(async () => {
  loading.value = true
  try {
    const data = await getConfig()
    Object.assign(config, data)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

const handleSave = async () => {
  saving.value = true
  try {
    await saveConfig(config)
    // Show success toast (using sonner or vuetify snackbar)
    alert('保存成功')
  } catch (e) {
    alert('保存失败')
  } finally {
    saving.value = false
  }
}

const handleTestMP = async () => {
  testingMP.value = true
  mpStatus.value = null
  try {
    // 1. 尝试登录获取 Token
    const loginRes = await loginMoviePilot(config.moviepilot.url, {
      username: config.moviepilot.username,
      password: config.moviepilot.password
    })

    if (loginRes.access_token) {
      // 2. 使用 Token 测试连接
      await testMoviePilot(config.moviepilot.url, loginRes.access_token)
      mpStatus.value = { success: true, message: '连接成功！' }
    } else {
      throw new Error('登录失败，未获取到 Token')
    }
  } catch (e: any) {
    mpStatus.value = { 
      success: false, 
      message: e.response?.data?.error || e.message || '连接失败' 
    }
  } finally {
    testingMP.value = false
  }
}
</script>

<template>
  <v-row>
    <v-col cols="12">
      <div class="d-flex justify-space-between align-center mb-6">
        <h2 class="text-h4 font-weight-bold">系统设置</h2>
        <v-btn color="primary" :loading="saving" @click="handleSave">
          <v-icon start>mdi-content-save</v-icon>
          保存配置
        </v-btn>
      </div>
    </v-col>

    <!-- MoviePilot 设置 -->
    <v-col cols="12" md="6">
      <v-card class="mb-6" elevation="2">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon color="primary" class="mr-3">mdi-movie-roll</v-icon>
          MoviePilot 集成
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <v-text-field
            v-model="config.moviepilot.url"
            label="服务器地址"
            placeholder="https://mp.example.com:3000"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          ></v-text-field>
          
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="config.moviepilot.username"
                label="用户名"
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="config.moviepilot.password"
                label="密码"
                type="password"
                variant="outlined"
                density="comfortable"
              ></v-text-field>
            </v-col>
          </v-row>

          <v-switch
            v-model="config.moviepilot.useProxy"
            label="强制走代理 (解决部分网络连通性问题)"
            color="primary"
            hide-details
            class="mb-4"
          ></v-switch>

          <v-alert
            v-if="mpStatus"
            :type="mpStatus.success ? 'success' : 'error'"
            variant="tonal"
            class="mb-4"
          >
            {{ mpStatus.message }}
          </v-alert>

          <v-btn 
            block 
            variant="tonal" 
            color="primary" 
            :loading="testingMP"
            @click="handleTestMP"
          >
            测试连接
          </v-btn>
        </v-card-text>
      </v-card>
    </v-col>

    <!-- TMDB 设置 -->
    <v-col cols="12" md="6">
      <v-card class="mb-6" elevation="2">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon color="info" class="mr-3">mdi-database-movie</v-icon>
          TMDB 配置
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <v-text-field
            v-model="config.tmdb.apiKey"
            label="API Key"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          ></v-text-field>
          <v-text-field
            v-model="config.tmdb.baseUrl"
            label="API Base URL"
            placeholder="https://api.themoviedb.org/3"
            variant="outlined"
            density="comfortable"
          ></v-text-field>
        </v-card-text>
      </v-card>

      <!-- 代理设置 -->
      <v-card elevation="2">
        <v-card-title class="d-flex align-center py-4 px-6">
          <v-icon color="secondary" class="mr-3">mdi-web</v-icon>
          网络代理
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <v-text-field
            v-model="config.proxy.http"
            label="HTTP 代理"
            placeholder="http://127.0.0.1:7890"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          ></v-text-field>
          <v-text-field
            v-model="config.proxy.https"
            label="HTTPS 代理"
            placeholder="http://127.0.0.1:7890"
            variant="outlined"
            density="comfortable"
          ></v-text-field>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>
