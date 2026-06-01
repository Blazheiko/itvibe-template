<template>
    <main class="static-view">
        <section class="static-section">
            <h1>About</h1>
            <p>
                ITVibe Template is an educational project template for learning a Vue 3 and
                TypeScript full-stack workspace.
            </p>
        </section>
    </main>
</template>

<style scoped>
.static-view {
    min-height: 100dvh;
    padding: 32px 20px;
    background: var(--bg-primary);
    color: var(--text-primary);
}

.static-section {
    max-width: 760px;
    margin: 0 auto;
}

h1 {
    margin: 0 0 12px;
    font-size: 28px;
}

p {
    margin: 0;
    color: var(--text-secondary);
}
</style>
