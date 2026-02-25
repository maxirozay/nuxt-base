<script setup lang="ts">
import AuthSettings from '~/components/AuthSettings.vue'
import FileDelete from '~/components/storage/FileDelete.vue'
import FileUpload from '~/components/storage/FileUpload.vue'

definePageMeta({
  middleware: ['authenticated'],
})

const { user, clear: clearSession } = useUserSession()

async function signout() {
  await clearSession()
  await navigateTo('/signin')
}
</script>

<template>
  <div class="portrait">
    <h1>Welcome {{ user?.email }}</h1>
    <button @click="signout">Sign Out</button>
    <AuthSettings />
    <h2>File Management</h2>
    <FileUpload
      path="test"
      @uploaded="(response) => console.log('File uploaded', response)"
    />
    <FileDelete path="test/file.png" />
  </div>
</template>
