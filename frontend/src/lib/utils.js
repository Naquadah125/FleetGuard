import { createCn } from 'cn/config'

// Teach the class merger the FleetGuard theme scales from src/index.css, otherwise
// `text-body` is read as a text *color* and dropped when merged with `text-white`
// (and `shadow-card` as a shadow color).
export const cn = createCn({
  extend: {
    theme: {
      text: ['display', 'h1', 'h2', 'h3', 'h4', 'body-lg', 'body', 'body-sm', 'caption'],
      shadow: ['card', 'card-hover', 'dashboard'],
    },
  },
})
