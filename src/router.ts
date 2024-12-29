import { createRouter, createWebHistory } from 'vue-router';
import GameSetup from './views/GameSetup.vue';
import GameBoard from './views/GameBoard.vue';

const routes = [
    { path: '/', name: 'GameSetup', component: GameSetup },
    { path: '/game', name: 'GameBoard', component: GameBoard },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;
