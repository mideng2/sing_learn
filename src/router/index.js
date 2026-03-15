import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'

const routes = [
  {
    path: '/',
    component: AppLayout,
    children: [
      {
        path: '',
        name: 'Playlist',
        component: () => import('@/views/playlist.vue'),
        meta: { title: '播放列表' }
      },
      {
        path: 'my-recordings',
        name: 'MyRecordings',
        component: () => import('@/views/my-recordings.vue'),
        meta: { title: '我的演唱歌单' }
      }
    ]
  },
  {
    path: '/player/:id',
    name: 'Player',
    component: () => import('@/views/player.vue'),
    meta: { title: '歌曲播放' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 唱歌学语言` : '唱歌学语言'
  next()
})

export default router
