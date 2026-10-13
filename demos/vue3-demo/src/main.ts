import { createApp } from 'vue'
import App from './App.vue'
import { SpeedBoardPlugin } from '@speed-board/vue3-antd'
import 'ant-design-vue/dist/reset.css'

const app = createApp(App)
app.use(SpeedBoardPlugin)
app.mount('#app')
