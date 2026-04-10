import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/my-portfolio/', // 👈 이 줄을 반드시 추가하게! (양끝에 슬래시 / 필수)
})