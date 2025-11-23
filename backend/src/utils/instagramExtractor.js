const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Extract image URL from Instagram post URL
 * Instagram URLs can be:
 * - https://www.instagram.com/p/POST_ID/
 * - https://www.instagram.com/reel/REEL_ID/
 * - Direct image URL (already extracted)
 */
async function extractInstagramImageUrl(postUrl) {
  try {
    // If it's already a direct image URL, return it
    if (postUrl.match(/\.(jpg|jpeg|png|webp)/i)) {
      return postUrl;
    }

    // Extract post ID from URL
    const postIdMatch = postUrl.match(/\/p\/([^\/]+)/) || postUrl.match(/\/reel\/([^\/]+)/);
    if (!postIdMatch) {
      throw new Error('Invalid Instagram URL format');
    }

    const postId = postIdMatch[1];
    
    // Try multiple methods to get the image URL
    
    // Method 1: Try to fetch the post page and extract image URL
    try {
      const response = await axios.get(postUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      
      // Try to find image in meta tags
      let imageUrl = $('meta[property="og:image"]').attr('content') ||
                     $('meta[name="og:image"]').attr('content') ||
                     $('meta[property="twitter:image"]').attr('content');

      if (imageUrl) {
        console.log('✅ Found image URL in meta tags:', imageUrl);
        return imageUrl;
      }

      // Fallback: Try to find image in script tags (Instagram embeds JSON-LD)
      const scripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        try {
          const jsonData = JSON.parse($(scripts[i]).html());
          if (jsonData.image) {
            const imgUrl = Array.isArray(jsonData.image) ? jsonData.image[0] : jsonData.image;
            console.log('✅ Found image URL in JSON-LD:', imgUrl);
            return imgUrl;
          }
        } catch (e) {
          // Continue to next script
        }
      }

      // Try to find in window._sharedData
      const sharedDataMatch = response.data.match(/window\._sharedData\s*=\s*({.+?});/);
      if (sharedDataMatch) {
        try {
          const sharedData = JSON.parse(sharedDataMatch[1]);
          const imageUrl = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media?.display_url;
          if (imageUrl) {
            console.log('✅ Found image URL in _sharedData:', imageUrl);
            return imageUrl;
          }
        } catch (e) {
          // Continue to fallback
        }
      }
    } catch (scrapeError) {
      console.warn('⚠️ Failed to scrape Instagram page:', scrapeError.message);
      // Continue to fallback methods
    }

    // Method 2: Try constructing direct media URL (fallback)
    // Instagram CDN format: https://instagram.com/p/{POST_ID}/media/?size=l
    const fallbackUrl = `https://instagram.com/p/${postId}/media/?size=l`;
    console.log('⚠️ Using fallback URL:', fallbackUrl);
    return fallbackUrl;

  } catch (error) {
    console.error('Error extracting Instagram image:', error.message);
    
    // Fallback: Try to construct direct media URL
    const postIdMatch = postUrl.match(/\/p\/([^\/]+)/) || postUrl.match(/\/reel\/([^\/]+)/);
    if (postIdMatch) {
      const postId = postIdMatch[1];
      return `https://instagram.com/p/${postId}/media/?size=l`;
    }
    
    throw new Error(`Failed to extract image URL: ${error.message}`);
  }
}

module.exports = {
  extractInstagramImageUrl
};

