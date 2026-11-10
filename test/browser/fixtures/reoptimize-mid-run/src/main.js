// no test imports these, so the optimizer only finds them when Vite
// pre-transforms this entry while serving index.html
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.getElementById('app')).render(createElement('div'))
