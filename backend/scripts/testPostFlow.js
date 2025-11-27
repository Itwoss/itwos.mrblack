const mongoose = require('mongoose');
const Post = require('../src/models/Post');
const User = require('../src/models/User');
const Follow = require('../src/models/Follow');
const FeedItem = require('../src/models/FeedItem');
const { update24hStats } = require('../src/services/trendingAlgorithm');
const { deliverPostToFeeds, getUserFeed } = require('../src/services/feedDelivery');
const { runTrendingUpdateJob } = require('../src/services/trendingAlgorithm');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/itwos-ai';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  }
}

async function createTestUsers() {
  console.log('\n👥 Creating test users...');
  
  const users = [];
  for (let i = 1; i <= 5; i++) {
    const hashedPassword = await bcrypt.hash('test123', 12);
    const user = await User.findOneAndUpdate(
      { email: `testuser${i}@test.com` },
      {
        name: `Test User ${i}`,
        username: `testuser${i}`,
        email: `testuser${i}@test.com`,
        passwordHash: hashedPassword, // Fixed: use passwordHash instead of password
        isVerified: true,
        followersCount: i * 10, // User 1: 10, User 2: 20, etc.
      },
      { upsert: true, new: true }
    );
    users.push(user);
    console.log(`✅ Created/Updated: ${user.name} (${user.followersCount} followers)`);
  }
  
  return users;
}

async function createFollowRelationships(users) {
  console.log('\n🔗 Creating follow relationships...');
  
  // User 2, 3, 4 follow User 1
  for (let i = 1; i <= 3; i++) {
    await Follow.findOneAndUpdate(
      { followerId: users[i]._id, followeeId: users[0]._id },
      { followerId: users[i]._id, followeeId: users[0]._id, status: 'accepted' },
      { upsert: true }
    );
  }
  
  console.log('✅ Follow relationships created (Users 2, 3, 4 follow User 1)');
}

async function createTestPost(user) {
  console.log('\n📸 Creating test post...');
  
  const post = new Post({
    userId: user._id,
    title: 'Test Post - Trending Test',
    bio: 'This is a test post to verify trending functionality. It should appear in feeds and potentially become trending.',
    tags: ['test', 'trending', 'automated'],
    imageUrl: '/uploads/posts/test-image.jpg',
    instagramRedirectUrl: 'https://instagram.com/p/test',
    privacy: 'public',
    status: 'published',
    followerCountAtPost: user.followersCount || 0,
    trendingEligibleAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago (eligible now)
    stats: {
      views_24h: 0,
      likes_24h: 0,
      comments_24h: 0,
      saves_24h: 0,
      shares_24h: 0,
      lastUpdated: new Date()
    }
  });
  
  await post.save();
  console.log(`✅ Post created: ${post._id}`);
  console.log(`   Title: ${post.title}`);
  console.log(`   Trending Eligible At: ${post.trendingEligibleAt}`);
  
  return post;
}

async function simulateEngagement(postId, options = {}) {
  console.log('\n engagement Simulating engagement...');
  
  const {
    views = 100,
    likes = 50,
    comments = 10,
    saves = 20,
    shares = 15
  } = options;
  
  // Get post first to ensure it exists
  let post = await Post.findById(postId);
  if (!post) {
    console.error('Post not found');
    return;
  }
  
  // Initialize stats if not exists
  if (!post.stats) {
    post.stats = {
      views_24h: 0,
      likes_24h: 0,
      comments_24h: 0,
      saves_24h: 0,
      shares_24h: 0,
      lastUpdated: new Date()
    };
  }
  
  // Directly update stats (faster than calling update24hStats for each)
  post.stats.views_24h = (post.stats.views_24h || 0) + views;
  post.stats.likes_24h = (post.stats.likes_24h || 0) + likes;
  post.stats.comments_24h = (post.stats.comments_24h || 0) + comments;
  post.stats.saves_24h = (post.stats.saves_24h || 0) + saves;
  post.stats.shares_24h = (post.stats.shares_24h || 0) + shares;
  post.stats.lastUpdated = new Date();
  
  // Also update total counts
  post.views = (post.views || 0) + views;
  post.likes = (post.likes || 0) + likes;
  post.comments = (post.comments || 0) + comments;
  post.saves = (post.saves || 0) + saves;
  post.shares = (post.shares || 0) + shares;
  
  await post.save();
  
  console.log(`✅ Engagement simulated!`);
  console.log(`   Final 24h Stats:`, post.stats);
  console.log(`   Total Stats: views=${post.views}, likes=${post.likes}, comments=${post.comments}, saves=${post.saves}, shares=${post.shares}`);
}

async function testFeedDelivery(postId, postOwnerId) {
  console.log('\n📤 Testing feed delivery...');
  
  const result = await deliverPostToFeeds(postId, postOwnerId.toString(), 'following');
  console.log(`✅ Feed delivery result:`);
  console.log(`   Delivered to: ${result.delivered} feeds`);
  console.log(`   Duplicates: ${result.duplicates}`);
  console.log(`   Total followers: ${result.total}`);
  
  return result;
}

async function checkTrendingStatus(postId) {
  console.log('\n🔥 Checking trending status...');
  
  const post = await Post.findById(postId).populate('userId', 'followersCount');
  console.log('Post details:');
  console.log(`   - ID: ${post._id}`);
  console.log(`   - Title: ${post.title}`);
  console.log(`   - Trending Status: ${post.trendingStatus ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Trending Score: ${post.trendingScore?.toFixed(2) || 'N/A'}`);
  console.log(`   - Trending Rank: ${post.trendingRank || 'N/A'}`);
  console.log(`   - Trending Since: ${post.trendingSince || 'N/A'}`);
  console.log(`   - Trending Eligible At: ${post.trendingEligibleAt}`);
  console.log(`   - 24h Stats:`, post.stats);
  console.log(`   - Engagement Score: ${post.engagementScore?.toFixed(2) || 'N/A'}`);
  console.log(`   - Follower Count at Post: ${post.followerCountAtPost}`);
  
  return post;
}

async function checkUserFeed(userId) {
  console.log('\n📰 Checking user feed...');
  
  const feed = await getUserFeed(userId.toString());
  console.log(`✅ Feed has ${feed.feedItems.length} items`);
  
  if (feed.feedItems.length > 0) {
    console.log('   First item:');
    const firstItem = feed.feedItems[0];
    console.log(`   - Post ID: ${firstItem.post?._id}`);
    console.log(`   - Source: ${firstItem.source}`);
    console.log(`   - Owner: ${firstItem.postOwner?.name || 'Unknown'}`);
  }
  
  return feed;
}

async function runTrendingUpdate() {
  console.log('\n🔄 Running trending update job...');
  
  const { runTrendingUpdateJob } = require('../src/services/trendingAlgorithm');
  const result = await runTrendingUpdateJob();
  
  console.log('✅ Trending update result:');
  console.log(`   Updated: ${result.updated} posts`);
  console.log(`   Total processed: ${result.total}`);
  console.log(`   Trending count: ${result.trendingCount}`);
  console.log(`   Min score threshold: ${result.minTrendingScore}`);
  
  return result;
}

async function main() {
  try {
    await connectDB();
    
    console.log('\n🧪 ========================================');
    console.log('   POST IMAGE FLOW TEST');
    console.log('========================================\n');
    
    // Step 1: Create test users
    const users = await createTestUsers();
    
    // Step 2: Create follow relationships
    await createFollowRelationships(users);
    
    // Step 3: Create a test post
    const post = await createTestPost(users[0]); // User 1 creates post
    
    // Step 4: Test feed delivery
    await testFeedDelivery(post._id, users[0]._id);
    
    // Step 5: Check feed for user 2 (who follows user 1)
    await checkUserFeed(users[1]._id);
    
    // Step 6: Check post status before engagement
    console.log('\n📊 Post status BEFORE engagement:');
    await checkTrendingStatus(post._id);
    
    // Step 7: Simulate engagement
    await simulateEngagement(post._id, {
      views: 150,
      likes: 75,
      comments: 15,
      saves: 30,
      shares: 20
    });
    
    // Step 8: Check post status after engagement
    console.log('\n📊 Post status AFTER engagement:');
    await checkTrendingStatus(post._id);
    
    // Step 9: Run trending update
    await runTrendingUpdate();
    
    // Step 10: Check trending status after update
    console.log('\n📊 Post status AFTER trending update:');
    await checkTrendingStatus(post._id);
    
    // Step 11: Check feed again
    await checkUserFeed(users[1]._id);
    
    console.log('\n✅ ========================================');
    console.log('   TEST COMPLETED SUCCESSFULLY!');
    console.log('========================================\n');
    
    console.log('📋 Summary:');
    console.log(`   - Post ID: ${post._id}`);
    console.log(`   - Post Owner: ${users[0].name} (${users[0].email})`);
    console.log(`   - Followers: Users 2, 3, 4 follow User 1`);
    console.log(`   - Test Users Credentials:`);
    for (let i = 0; i < users.length; i++) {
      console.log(`     User ${i + 1}: ${users[i].email} / test123`);
    }
    console.log('\n📝 Next Steps:');
    console.log('   1. Login as testuser2@test.com in frontend');
    console.log('   2. Check feed - you should see the test post');
    console.log('   3. Login as admin and check Post Management');
    console.log('   4. Check Trending Analytics dashboard');
    console.log('   5. Verify trending badge appears if post is trending');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 MongoDB disconnected');
  }
}

main();

