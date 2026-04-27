<script setup lang="ts">
const appStore = useAppStore()
const emits = defineEmits(['uploaded'])
const props = defineProps({
  path: String,
  isPrivate: {
    type: Boolean,
    default: true,
  },
})

const progress = ref<number>(0)

async function uploadFile(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files || input.files.length === 0 || !props.path) return

  try {
    let response = await uploadFiles(Array.from(input.files), props.path, props.isPrivate, (p) => {
      progress.value = p
    })
    emits('uploaded', response)
    appStore.notify('saved', 'success')
  } catch (e: any) {
    appStore.notify(e.data?.message, 'error')
  }
  progress.value = 0
  input.value = ''
}
</script>

<template>
  <div
    v-if="progress"
    class="modal flex-center"
  >
    <progress
      v-if="progress"
      :value="progress"
      max="100"
      style="width: 90vw"
    >
      {{ progress }}%
    </progress>
  </div>
  <input
    v-else
    type="file"
    multiple
    @change="uploadFile"
  />
</template>
