import resolve from '@rollup/plugin-node-resolve.js'
import commonjs from '@rollup/plugin-commo.js'
import json from '@rollup/plugin-json.js'
import { terser } from 'rollup-plugin-terser.js'

export default {
  input: './index.js', // Entry point of your application
  output: {
    file: 'dist/bundle.js', // Output file
    format: 'esm', // CommonJS format for Node.js
    sourcemap: true, // Generate source map for easier debugging
  },
  external: ['fs', 'path', 'http', 'https'], // Mark Node.js built-in modules as external
  plugins: [
    resolve({
      extensions: ['.js'],
      mainFields: ['module', 'main'],
      mainFiles: ['index'], // Look for 'index' files
      // Optional: if you have custom module directories
      moduleDirectories: ['node_modules'],
    }),
    commonjs(),
    json(), // Import JSON files
    //terser(), // Minify the output
  ],
}