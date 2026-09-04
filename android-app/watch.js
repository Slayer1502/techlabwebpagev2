import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { watch } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')
const wwwDir = path.join(__dirname, 'www')

const files = ['index.html', 'products.html', 'services.html', 'login.html', 'sales.html', 'admin.html', 'employee.html', 'customer.html', 'script.js', 'styles.css']

const copyFile = (src, dest) => {
  const srcPath = path.join(rootDir, src)
  if (!fs.existsSync(srcPath)) return
  fs.copyFileSync(srcPath, dest)
  console.log(`Synced: ${src}`)
}

console.log(`Watching for changes in ${rootDir}...`)

files.forEach(f => copyFile(f, path.join(wwwDir, f)))

watch(rootDir, (eventType, filename) => {
  if (files.includes(filename)) {
    copyFile(filename, path.join(wwwDir, filename))
  }
})