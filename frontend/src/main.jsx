import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('🚀 Main.jsx loading...')
console.log('📦 Root element:', document.getElementById('root'))

try {
  const root = ReactDOM.createRoot(document.getElementById('root'))
  console.log('✅ Root created successfully')
  
  root.render(React.createElement(App))
  console.log('✅ App rendered successfully')
} catch (error) {
  console.error('❌ Error rendering app:', error)
}