import { join } from 'path'
import privateModule from './private.js'

const root = join(import.meta.url, '..')
console.log(root)
export default {
  root,
  ...privateModule,
}
