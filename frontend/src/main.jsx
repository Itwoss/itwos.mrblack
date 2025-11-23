import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

console.log('🚀 Main.jsx loading...')
console.log('📦 Root element:', document.getElementById('root'))

// Add a simple test render first
const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('❌ Root element not found!')
  document.body.innerHTML = '<div style="padding: 20px; color: red; font-size: 20px;">Error: Root element not found. Please check index.html</div>'
} else {
  try {
    const root = ReactDOM.createRoot(rootElement)
    console.log('✅ Root created successfully')
    
    // Render App
    root.render(React.createElement(App))
    console.log('✅ App rendered successfully')
  } catch (error) {
    console.error('❌ Error rendering app:', error)
    console.error('Error stack:', error.stack)
    
    // Show error on screen
    rootElement.innerHTML = `
      <div style="padding: 20px; color: red; font-family: monospace;">
        <h1>❌ Error Loading App</h1>
        <h2>Error Message:</h2>
        <p style="background: #f0f0f0; padding: 10px; border-radius: 4px;">${error.message}</p>
        <h2>Stack Trace:</h2>
        <pre style="background: #f0f0f0; padding: 10px; border-radius: 4px; overflow: auto;">${error.stack}</pre>
        <p style="margin-top: 20px;">Please check the browser console (F12) for more details.</p>
      </div>
    `
  }
}