<script setup lang="ts">
import { useAppStore } from '~/stores/app'

const appStore = useAppStore()
const emits = defineEmits(['uploaded'])
const props = defineProps({
  path: String,
})

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0 || !props.path) return

  const file = input.files[0] as any
  const formData = new FormData()
  formData.append('file', file)
  formData.append('path', props.path)

  try {
    const response = await $fetch('/api/files', {
      method: 'POST',
      body: formData,
    })
    emits('uploaded', response)
    appStore.notify('saved', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
  input.value = ''
}
</script>

<template>
  <input
    type="file"
    @change="uploadFile"
  />
</template>
