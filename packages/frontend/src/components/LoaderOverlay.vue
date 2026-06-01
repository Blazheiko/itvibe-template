<script setup lang="ts">
const props = defineProps({
  show: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div class="loader-overlay" v-if="props.show">
    <div class="loader">
      <div></div>
      <div></div>
      <div></div>
    </div>
  </div>
</template>

<style scoped>
.loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.7);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loader {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.loader div {
  width: 12px;
  height: 12px;
  background-color: #003399;
  border-radius: 50%;
  animation: loaderAnimation 1.4s infinite ease-in-out both;
}

.loader div:nth-child(1) {
  animation-delay: -0.32s;
}

.loader div:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes loaderAnimation {
  0%,
  80%,
  100% {
    transform: scale(0);
    opacity: 0.3;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
