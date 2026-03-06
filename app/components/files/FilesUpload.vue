<script setup lang="ts">
const appStore = useAppStore()
const emits = defineEmits(['uploaded'])
const props = defineProps({
  path: String,
  isPrivate: {
    type: Boolean,
    default: true,
  },
  s3Upload: {
    type: Boolean,
    default: true,
  },
})

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0 || !props.path) return

  try {
    const file = input.files[0] as any
    if (props.s3Upload) {
      const response = await s3Upload(file)
      emits('uploaded', response)
    } else {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('path', props.path)
      formData.append('isPrivate', String(props.isPrivate))
      const response = await $fetch('/api/files', {
        method: 'POST',
        body: formData,
      })
      emits('uploaded', response)
    }
    appStore.notify('saved', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
  input.value = ''
}

async function s3Upload(file: File) {
  const uploadUrl = await $fetch('/api/files/presigned-upload', {
    method: 'POST',
    body: {
      path: props.path,
      filename: file.name,
      contentType: file.type,
      isPrivate: props.isPrivate,
    },
  })

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type,
    },
  })
  console.log(response)
  return response
}
</script>

<template>
  <input
    type="file"
    @change="uploadFile"
  />
</template>
