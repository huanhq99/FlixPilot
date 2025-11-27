<script setup lang="ts">
import { ref } from 'vue'
import { useTheme } from 'vuetify'

const theme = useTheme()
const drawer = ref(true)

const menuItems = [
  { title: '仪表盘', icon: 'mdi-view-dashboard', to: '/dashboard' },
  { title: '媒体库', icon: 'mdi-movie-open', to: '/library' },
  { title: '设置', icon: 'mdi-cog', to: '/settings' },
]
</script>

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer" app color="background">
      <div class="d-flex align-center pa-4">
        <v-img src="/vite.svg" max-width="40" class="mr-3"></v-img>
        <span class="text-h6 font-weight-bold">StreamHub</span>
      </div>
      
      <v-list nav>
        <v-list-item
          v-for="item in menuItems"
          :key="item.title"
          :prepend-icon="item.icon"
          :title="item.title"
          :to="item.to"
          active-class="primary--text"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app flat color="background">
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-spacer></v-spacer>
      <v-btn icon>
        <v-icon>mdi-bell-outline</v-icon>
      </v-btn>
      <v-avatar color="primary" size="36" class="ml-4">
        <span class="text-white">A</span>
      </v-avatar>
    </v-app-bar>

    <v-main class="bg-grey-lighten-4">
      <v-container fluid class="pa-6">
        <router-view></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<style>
.v-application {
  background-color: #f4f5fa !important;
}
.v-theme--dark .v-application {
  background-color: #28243d !important;
}
</style>
