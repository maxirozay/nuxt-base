<script setup lang="ts">
const appStore = useAppStore()
const emits = defineEmits(['deleted'])
const props = defineProps({
  path: String,
  isPrivate: {
    type: Boolean,
    default: true,
  },
})

async function deleteFile() {
  try {
    await appStore.confirm()
    await $fetch('/api/files', {
      method: 'DELETE',
      body: { path: props.path, isPrivate: props.isPrivate },
    })
    appStore.notify('deleted', 'success')
    emits('deleted')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
}
</script>

<template>
  <button
    type="button"
    class="flex-row g2"
    @click="deleteFile"
  >
    {{ $t('delete') }}<Icon name="uil:trash" />
  </button>
</template>
