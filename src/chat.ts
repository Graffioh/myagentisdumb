import { mount } from 'svelte'
import './app.css'
import Chat from './lib/dev/Chat.svelte'

const app = mount(Chat, {
  target: document.getElementById('app')!,
})

export default app
