#!/usr/bin/env node

/**
 * Memory Monitor for Development Server
 * Monitors Node.js memory usage and provides alerts
 */

const os = require('os');

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getMemoryUsage() {
  const used = process.memoryUsage();
  const total = os.totalmem();
  const free = os.freemem();
  
  return {
    rss: formatBytes(used.rss),
    heapTotal: formatBytes(used.heapTotal),
    heapUsed: formatBytes(used.heapUsed),
    external: formatBytes(used.external),
    total: formatBytes(total),
    free: formatBytes(free),
    used: formatBytes(total - free),
    heapUsagePercent: ((used.heapUsed / used.heapTotal) * 100).toFixed(2)
  };
}

function logMemoryUsage() {
  const mem = getMemoryUsage();
  console.log(`\n📊 Memory Usage Report:`);
  console.log(`   RSS: ${mem.rss}`);
  console.log(`   Heap Total: ${mem.heapTotal}`);
  console.log(`   Heap Used: ${mem.heapUsed} (${mem.heapUsagePercent}%)`);
  console.log(`   External: ${mem.external}`);
  console.log(`   System Total: ${mem.total}`);
  console.log(`   System Free: ${mem.free}`);
  
  // Alert if memory usage is high
  if (parseFloat(mem.heapUsagePercent) > 80) {
    console.log(`⚠️  WARNING: High memory usage detected!`);
    console.log(`   Consider restarting the development server.`);
  }
  
  if (parseFloat(mem.heapUsagePercent) > 90) {
    console.log(`🚨 CRITICAL: Very high memory usage!`);
    console.log(`   Restart the development server immediately.`);
  }
}

// Monitor memory every 30 seconds
setInterval(logMemoryUsage, 30000);

// Initial report
console.log('🔍 Memory Monitor started. Monitoring every 30 seconds...');
logMemoryUsage();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Memory Monitor stopped.');
  process.exit(0);
});

