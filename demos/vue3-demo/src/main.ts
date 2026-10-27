import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import { SpeedBoardPlugin } from '@speed-board/vue3-antd';
import App from './App.vue';

const app = createApp(App);
app.use(Antd);
app.use(SpeedBoardPlugin);
app.mount('#app');
