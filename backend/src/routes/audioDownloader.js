const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireUser } = require('../middleware/auth');
const router = express.Router();

// Set ffmpeg path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

// Ensure audio directory exists
const audioDir = path.join(__dirname, '../../uploads/audio-downloads');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

// POST /api/audio/download - Download and convert audio from URL
router.post('/download', authenticateToken, requireUser, async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ 
      success: false,
      error: 'URL is required' 
    });
  }

  // Validate YouTube URL
  if (!ytdl.validateURL(url)) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid YouTube URL' 
    });
  }

  try {
    // Try yt-dlp first (more reliable), fallback to ytdl-core
    let info;
    let useYtDlp = false;
    let videoTitle = '';
    let videoId = '';
    
    // Check if yt-dlp is available (try multiple methods)
    try {
      // Try direct yt-dlp command
      await execAsync('which yt-dlp');
      useYtDlp = true;
      console.log('✅ Using yt-dlp (more reliable)');
    } catch (e) {
      try {
        // Try python3 -m yt_dlp (pip3 installation)
        await execAsync('python3 -m yt_dlp --version');
        useYtDlp = true;
        console.log('✅ Using yt-dlp via python3 (more reliable)');
      } catch (e2) {
        console.log('⚠️ yt-dlp not found, using ytdl-core');
        useYtDlp = false;
      }
    }
    
    // Extract video ID from URL
    const urlMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/);
    videoId = urlMatch ? urlMatch[1] : null;
    
    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid YouTube URL format'
      });
    }
    
    // Use yt-dlp if available (more reliable, handles 410 errors better)
    if (useYtDlp) {
      try {
        console.log('📥 Getting video info with yt-dlp...');
        
        // Get video info using yt-dlp (try direct command first, then python3 -m)
        let stdout;
        try {
          ({ stdout } = await execAsync(`yt-dlp --dump-json --no-warnings "${url}"`, { 
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000 
          }));
        } catch (e) {
          // Fallback to python3 -m yt_dlp
          ({ stdout } = await execAsync(`python3 -m yt_dlp --dump-json --no-warnings "${url}"`, { 
            maxBuffer: 10 * 1024 * 1024,
            timeout: 30000 
          }));
        }
        const videoInfo = JSON.parse(stdout);
        videoTitle = videoInfo.title || 'Unknown';
        videoId = videoInfo.id || videoId;
        
        console.log(`🎵 Using yt-dlp for: ${videoTitle}`);
      } catch (ytdlpError) {
        console.error('❌ yt-dlp error, falling back to ytdl-core:', ytdlpError.message);
        useYtDlp = false;
      }
    }
    
    // Fallback to ytdl-core if yt-dlp fails or not available
    if (!useYtDlp) {
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          info = await ytdl.getInfo(url, {
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.youtube.com/'
              }
            }
          });
          videoTitle = info.videoDetails.title;
          videoId = info.videoDetails.videoId;
          break; // Success, exit retry loop
        } catch (getInfoError) {
          console.error(`❌ Error getting video info (attempt ${retries + 1}/${maxRetries + 1}):`, getInfoError.message);
          console.error('Error details:', {
            message: getInfoError.message,
            status: getInfoError.status,
            statusCode: getInfoError.statusCode,
            code: getInfoError.code
          });
          
          // Check for 410 status code (Gone - YouTube blocking)
          const statusCode = getInfoError.status || getInfoError.statusCode || 
                            (getInfoError.message && getInfoError.message.includes('410') ? 410 : null);
          
          if (statusCode === 410) {
            return res.status(500).json({
              success: false,
              error: 'YouTube is blocking this request (410 Gone). Please install yt-dlp for better reliability: brew install yt-dlp (Mac) or pip install yt-dlp (Linux/Windows)'
            });
          }
          
          // If it's the "Could not extract functions" error, try again
          if (getInfoError.message && (getInfoError.message.includes('extract') || getInfoError.message.includes('functions'))) {
            if (retries < maxRetries) {
              retries++;
              console.log(`🔄 Retrying... (${retries}/${maxRetries})`);
              // Wait a bit before retrying
              await new Promise(resolve => setTimeout(resolve, 1000 * retries));
              continue;
            } else {
              return res.status(500).json({
                success: false,
                error: 'YouTube extraction failed after multiple attempts. Please install yt-dlp for better reliability: brew install yt-dlp (Mac) or pip install yt-dlp (Linux/Windows)'
              });
            }
          }
          
          // Check for other status codes
          if (statusCode && statusCode >= 400) {
            return res.status(500).json({
              success: false,
              error: `YouTube returned error ${statusCode}. Please install yt-dlp for better reliability: brew install yt-dlp (Mac) or pip install yt-dlp (Linux/Windows)`
            });
          }
          
          // For other errors, throw immediately
          throw getInfoError;
        }
      }
    }
    
    // Clean video title for filename
    const safeTitle = videoTitle.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${videoId}-${timestamp}.mp3`;
    const outputPath = path.join(audioDir, filename);

    console.log(`🎵 Starting audio download: ${videoTitle}`);

    // Use yt-dlp if available (more reliable, handles 410 errors better)
    if (useYtDlp) {
      try {
        console.log('📥 Downloading with yt-dlp...');
        
        // Use yt-dlp to download and convert directly to MP3 320kbps
        // Try direct command first, then python3 -m as fallback
        let ytdlpCommand = `yt-dlp -x --audio-format mp3 --audio-quality 320K --no-warnings --no-playlist -o "${outputPath}" "${url}"`;
        
        try {
          await execAsync(ytdlpCommand, { 
            maxBuffer: 10 * 1024 * 1024,
            timeout: 300000 // 5 minutes timeout
          });
        } catch (e) {
          // Fallback to python3 -m yt_dlp
          ytdlpCommand = `python3 -m yt_dlp -x --audio-format mp3 --audio-quality 320K --no-warnings --no-playlist -o "${outputPath}" "${url}"`;
          await execAsync(ytdlpCommand, { 
            maxBuffer: 10 * 1024 * 1024,
            timeout: 300000 // 5 minutes timeout
          });
        }
        
        // Check if file was created
        if (fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
          
          console.log('✅ Audio downloaded with yt-dlp:', filename);
          
          res.json({
            success: true,
            downloadUrl: `/uploads/audio-downloads/${filename}`,
            filename: filename,
            title: videoTitle,
            fileSize: stats.size,
            fileSizeMB: fileSizeMB,
            message: 'Audio downloaded and converted successfully (using yt-dlp)'
          });
          return;
        } else {
          throw new Error('File was not created by yt-dlp');
        }
      } catch (ytdlpError) {
        console.error('❌ yt-dlp download failed:', ytdlpError.message);
        // Fall through to ytdl-core method
        useYtDlp = false;
      }
    }
    
    // Fallback to ytdl-core method
    if (!useYtDlp && info) {
      // Download audio stream with highest quality and better options
      let stream;
      try {
        stream = ytdl(url, { 
          quality: 'highestaudio',
          filter: 'audioonly',
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Referer': 'https://www.youtube.com/'
            }
          }
        });
        
        // Handle stream errors
        stream.on('error', (streamError) => {
          console.error('❌ Stream error:', streamError);
          if (streamError.message && streamError.message.includes('410')) {
            return res.status(500).json({
              success: false,
              error: 'YouTube is blocking this request (410 Gone). Please install yt-dlp for better reliability: brew install yt-dlp (Mac) or pip install yt-dlp (Linux/Windows)'
            });
          }
        });
      } catch (streamError) {
        console.error('❌ Error creating stream:', streamError);
        if (streamError.message && streamError.message.includes('410')) {
          return res.status(500).json({
            success: false,
            error: 'YouTube is blocking this request (410 Gone). Please install yt-dlp for better reliability: brew install yt-dlp (Mac) or pip install yt-dlp (Linux/Windows)'
          });
        }
        throw streamError;
      }

      // Convert to MP3 320kbps
      return new Promise((resolve, reject) => {
        ffmpeg(stream)
          .audioBitrate(320) // Best quality: 320kbps
          .audioCodec('libmp3lame')
          .toFormat('mp3')
          .on('start', (commandLine) => {
            console.log('🔄 FFmpeg command:', commandLine);
          })
          .on('progress', (progress) => {
            console.log('📊 Processing:', progress.percent + '%');
          })
          .on('end', () => {
            console.log('✅ Audio conversion completed:', filename);
            
            // Check if file exists
            if (fs.existsSync(outputPath)) {
              const stats = fs.statSync(outputPath);
              const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
              
              res.json({
                success: true,
                downloadUrl: `/uploads/audio-downloads/${filename}`,
                filename: filename,
                title: info.videoDetails.title,
                duration: info.videoDetails.lengthSeconds,
                fileSize: stats.size,
                fileSizeMB: fileSizeMB,
                message: 'Audio downloaded and converted successfully'
              });
              resolve();
            } else {
              reject(new Error('File was not created'));
            }
          })
          .on('error', (err) => {
            console.error('❌ FFmpeg error:', err);
            res.status(500).json({ 
              success: false,
              error: 'Error converting audio: ' + err.message 
            });
            reject(err);
          })
          .save(outputPath);
      });
    } else if (!useYtDlp && !info) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get video information. Please install yt-dlp for better reliability: brew install yt-dlp (Mac) or pip install yt-dlp (Linux/Windows)'
      });
    }

  } catch (error) {
    console.error('❌ Download error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    let errorMessage = 'Failed to download audio';
    
    // Check for status codes in error
    const statusCode = error.status || error.statusCode || 
                      (error.message && error.message.match(/Status code: (\d+)/)?.[1]);
    
    // Provide more specific error messages
    if (statusCode === '410' || error.message?.includes('410')) {
      errorMessage = 'YouTube is blocking this request (410 Gone). This video may be restricted, age-gated, or YouTube has changed their API. Please try a different public video URL.';
    } else if (statusCode === '403' || error.message?.includes('403')) {
      errorMessage = 'Access forbidden. This video may be private, restricted, or YouTube is blocking access.';
    } else if (statusCode === '404' || error.message?.includes('404')) {
      errorMessage = 'Video not found. Please check the URL and try again.';
    } else if (error.message && error.message.includes('extract')) {
      errorMessage = 'YouTube extraction failed. This may be due to YouTube changes. Please try again later or use a different video URL.';
    } else if (error.message && error.message.includes('Private video')) {
      errorMessage = 'This video is private and cannot be downloaded.';
    } else if (error.message && error.message.includes('Video unavailable')) {
      errorMessage = 'This video is unavailable or has been removed.';
    } else if (error.message && error.message.includes('Sign in to confirm your age')) {
      errorMessage = 'This video requires age verification and cannot be downloaded.';
    } else if (statusCode) {
      errorMessage = `YouTube returned error ${statusCode}. The video may be unavailable, private, or restricted. Please try a different video URL.`;
    } else {
      errorMessage = error.message || 'Failed to download audio. Please check the URL and try again.';
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage
    });
  }
});

// GET /api/audio/list - Get list of downloaded audio files (for current user)
router.get('/list', authenticateToken, requireUser, async (req, res) => {
  try {
    const files = fs.readdirSync(audioDir);
    const audioFiles = files
      .filter(file => file.endsWith('.mp3'))
      .map(file => {
        const filePath = path.join(audioDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          downloadUrl: `/uploads/audio-downloads/${file}`,
          size: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          createdAt: stats.birthtime
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt); // Sort by newest first

    res.json({
      success: true,
      files: audioFiles,
      count: audioFiles.length
    });
  } catch (error) {
    console.error('❌ Error listing audio files:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list audio files'
    });
  }
});

// DELETE /api/audio/:filename - Delete an audio file
router.delete('/:filename', authenticateToken, requireUser, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(audioDir, filename);

    // Security: prevent path traversal
    if (!filename.endsWith('.mp3') || filename.includes('..')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({
        success: true,
        message: 'Audio file deleted successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'File not found'
      });
    }
  } catch (error) {
    console.error('❌ Error deleting audio file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete audio file'
    });
  }
});

module.exports = router;

