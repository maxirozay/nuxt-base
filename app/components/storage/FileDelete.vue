<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const appStore = useAppStore()
const emits = defineEmits(['deleted'])
const props = defineProps({
  path: String,
})

async function deleteFile() {
  if (!confirm('Are you sure you want to delete this file?')) return

  try {
    await $fetch('/api/files', {
      method: 'DELETE',
      body: { path: props.path },
    })
    appStore.notify('deleted', 'success')
    emits('deleted')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}
</script>

<template>
  <button @click="deleteFile">{{ $t('delete') }}</button>
</template>
