// no test imports these, so the optimizer finds them only when the fixture
// pre-transforms this file during the run
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'

createRoot(document.body).render(createElement('div'))
