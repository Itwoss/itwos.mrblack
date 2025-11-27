/**
 * Test Script for Trending Posts
 * 
 * Usage:
 *   node backend/scripts/testTrending.js POST_ID USER_ID TOKEN
 * 
 * This script will:
 * 1. Generate engagement (views, likes, comments) for a post
 * 2. Trigger trending calculation
 * 3. Check if the post became trending
 */

const axios = require('axios');
const { runTrendingUpdateJob } = require('../src/services/trendingAlgorithm');

const BASE_URL = process.env.API_URL || 'http://localhost:7000/api';
const POST_ID = process.argv[2];
const USER_ID = process.argv[3];
const TOKEN = process.argv[4];

if (!POST_ID || !USER_ID || !TOKEN) {
  console.error('❌ Usage: node testTrending.js POST_ID USER_ID TOKEN');
  process.exit(1);
}

async function generateEngagement() {
  console.log('📊 Generating engagement for post:', POST_ID);
  
  const headers = {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json'
  };

  try {
    // Generate views (50 views)
    console.log('👁️  Generating views...');
    for (let i = 0; i < 50; i++) {
      try {
        await axios.post(`${BASE_URL}/posts/${POST_ID}/view`, {}, { headers });
      } catch (err) {
        // Ignore duplicate view errors
        if (!err.response?.data?.message?.includes('already viewed')) {
          console.warn('View error:', err.response?.data?.message);
        }
      }
    }
    console.log('✅ Generated 50 views');

    // Generate likes (20 likes)
    console.log('❤️  Generating likes...');
    for (let i = 0; i < 20; i++) {
      try {
        await axios.post(`${BASE_URL}/posts/${POST_ID}/like`, {}, { headers });
        // Toggle to ensure we can like again
        await axios.post(`${BASE_URL}/posts/${POST_ID}/like`, {}, { headers });
        await axios.post(`${BASE_URL}/posts/${POST_ID}/like`, {}, { headers });
      } catch (err) {
        console.warn('Like error:', err.response?.data?.message);
      }
    }
    console.log('✅ Generated 20 likes');

    // Generate comments (10 comments)
    console.log('💬 Generating comments...');
    for (let i = 0; i < 10; i++) {
      try {
        await axios.post(
          `${BASE_URL}/posts/${POST_ID}/comment`,
          { text: `Test comment ${i + 1} for trending test` },
          { headers }
        );
      } catch (err) {
        console.warn('Comment error:', err.response?.data?.message);
      }
    }
    console.log('✅ Generated 10 comments');

    // Generate saves (5 saves)
    console.log('🔖 Generating saves...');
    for (let i = 0; i < 5; i++) {
      try {
        await axios.post(`${BASE_URL}/posts/${POST_ID}/save`, {}, { headers });
      } catch (err) {
        console.warn('Save error:', err.response?.data?.message);
      }
    }
    console.log('✅ Generated 5 saves');

    // Generate shares (3 shares)
    console.log('📤 Generating shares...');
    for (let i = 0; i < 3; i++) {
      try {
        await axios.post(`${BASE_URL}/posts/${POST_ID}/share`, {}, { headers });
      } catch (err) {
        console.warn('Share error:', err.response?.data?.message);
      }
    }
    console.log('✅ Generated 3 shares');

  } catch (error) {
    console.error('❌ Error generating engagement:', error.message);
    throw error;
  }
}

async function checkPostStatus() {
  console.log('\n📋 Checking post status...');
  
  try {
    const response = await axios.get(`${BASE_URL}/posts/${POST_ID}`, {
      headers: {
        'Authorization': `Bearer ${TOKEN}`
      }
    });

    const post = response.data.data;
    
    console.log('\n📊 Post Statistics:');
    console.log('  - Total Views:', post.views || 0);
    console.log('  - Total Likes:', post.likes || 0);
    console.log('  - Total Comments:', post.comments || 0);
    console.log('  - Total Saves:', post.saves || 0);
    console.log('  - Total Shares:', post.shares || 0);
    
    console.log('\n📈 24-Hour Stats:');
    if (post.stats) {
      console.log('  - Views (24h):', post.stats.views_24h || 0);
      console.log('  - Likes (24h):', post.stats.likes_24h || 0);
      console.log('  - Comments (24h):', post.stats.comments_24h || 0);
      console.log('  - Saves (24h):', post.stats.saves_24h || 0);
      console.log('  - Shares (24h):', post.stats.shares_24h || 0);
      console.log('  - Last Updated:', post.stats.lastUpdated || 'N/A');
    } else {
      console.log('  - No 24h stats available');
    }
    
    console.log('\n🔥 Trending Status:');
    console.log('  - Trending Status:', post.trendingStatus ? '✅ YES' : '❌ NO');
    console.log('  - Trending Rank:', post.trendingRank || 'N/A');
    console.log('  - Trending Score:', post.trendingScore?.toFixed(2) || 'N/A');
    console.log('  - Trending Since:', post.trendingSince || 'N/A');
    
    if (post.trendingStatus) {
      console.log('\n🎉 SUCCESS! Post is trending!');
    } else {
      console.log('\n⚠️  Post is not trending yet.');
      console.log('   This could be because:');
      console.log('   - Not enough engagement');
      console.log('   - Post is too old (>24h)');
      console.log('   - Trending calculation not run yet');
      console.log('   - Score not high enough (need top 0.5% or top 100)');
    }
    
    return post;
  } catch (error) {
    console.error('❌ Error checking post status:', error.response?.data || error.message);
    throw error;
  }
}

async function triggerTrendingCalculation() {
  console.log('\n⚡ Triggering trending calculation...');
  try {
    await runTrendingUpdateJob();
    console.log('✅ Trending calculation complete!');
  } catch (error) {
    console.error('❌ Error running trending calculation:', error.message);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Trending Test\n');
    console.log('Post ID:', POST_ID);
    console.log('User ID:', USER_ID);
    console.log('Base URL:', BASE_URL);
    console.log('');

    // Step 1: Generate engagement
    await generateEngagement();
    
    // Step 2: Trigger trending calculation
    await triggerTrendingCalculation();
    
    // Step 3: Check status
    await checkPostStatus();
    
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

main();

