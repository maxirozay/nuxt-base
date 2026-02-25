<script setup lang="ts">
import AuthSettings from '~/components/AuthSettings.vue'

definePageMeta({
  middleware: ['authenticated'],
})

const { user, clear: clearSession } = useUserSession()

async function signout() {
  await clearSession()
  await navigateTo('/signin')
}

async function uploadFile(event: Event, path: string) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0) return

  const file = input.files[0] as any
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', path)

  try {
    const response = await $fetch('/api/files', {
      method: 'POST',
      body: formData,
    })
    console.log(response)
  } catch (e: any) {
    alert(e.data?.message || 'Upload failed')
  }
  input.value = ''
}

async function deleteFile(path: string) {
  if (!confirm('Are you sure you want to delete this file?')) return

  try {
    await $fetch('/api/files', {
      method: 'DELETE',
      body: { path },
    })
  } catch (e: any) {
    alert(e.data?.message || 'Delete failed')
  }
}

async function listFolder(path: string) {
  try {
    const response = await $fetch(`/api/files?path=${encodeURIComponent(path)}`)
    console.log(response)
  } catch (e: any) {
    alert(e || 'List folder failed')
  }
}
</script>

<template>
  <div class="portrait">
    <h1>Welcome {{ user?.email }}</h1>
    <button @click="signout">Sign Out</button>
    <AuthSettings />
    <h2>File Management</h2>
    <input
      type="file"
      @change="(e) => uploadFile(e, 'test')"
    />
    <button @click="deleteFile('test/file.png')">Delete</button>
    <button @click="listFolder('test')">List Folder</button>
  </div>
</template>
