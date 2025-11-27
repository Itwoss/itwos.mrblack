import React, { useState, useRef, useEffect } from 'react';
import { Button, Input, Space, Image, Modal, Slider, message as antMessage, Typography } from 'antd';
import { 
  SendOutlined, 
  PictureOutlined, 
  SmileOutlined, 
  SoundOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  AudioOutlined,
  StopOutlined
} from '@ant-design/icons';

const { TextArea } = Input;
const { Text } = Typography;

/**
 * ChatInputWithMedia Component
 * 
 * Features:
 * - Send text messages
 * - Pick image, auto-compress to <= 1MB (client-side) and preview
 * - Pick a sticker (simple selection grid)
 * - Pick a local audio file, preview, trim a selected 30s clip, add title/note, and export trimmed audio blob
 */
export default function ChatInputWithMedia({ 
  onSend = (payload) => console.log('send', payload),
  disabled = false,
  placeholder = "Message...",
  theme = {
    inputBg: 'rgba(255, 255, 255, 0.9)',
    accentColor: '#0A84FF'
  }
}) {
  const [text, setText] = useState('');
  
  // Image state
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const imageFileRef = useRef(null);
  
  // Sticker
  const stickers = [
    '🔥', '😂', '❤️', '👍', '🎉', '😮', '😢', '🤝', '😍', '🙏', '💯', '✨'
  ];
  const [selectedSticker, setSelectedSticker] = useState(null);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  
  // Audio state
  const [audioFile, setAudioFile] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimLength, setTrimLength] = useState(30);
  const [audioTitle, setAudioTitle] = useState('');
  const [audioNote, setAudioNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const audioFileRef = useRef(null);
  const textAreaRef = useRef(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [recordedAudioURL, setRecordedAudioURL] = useState(null);
  const mediaRecorderRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Voice input state
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle | dictating | voice-to-text
  const [voiceMode, setVoiceMode] = useState(null); // 'send' | 'text' | null
  const recognitionRef = useRef(null);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);

  // Check for Speech Recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      // Configure recognition settings
      recognition.lang = navigator.language || 'en-US';
      recognition.interimResults = true; // Enable interim results for real-time feedback
      recognition.maxAlternatives = 1;
      recognition.continuous = false; // Set to false for better control

      recognition.onstart = () => {
        console.log('🎙️ Speech recognition started');
        antMessage.success('🎙️ Listening... Speak now!', 1);
      };

      recognition.onresult = (event) => {
        console.log('🎤 Speech result received:', event);
        
        let interimTranscript = '';
        let finalTranscript = '';

        // Process all results
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          console.log(`Result ${i}: ${transcript} (isFinal: ${event.results[i].isFinal})`);
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const currentStatus = voiceStatus;
        const currentMode = voiceMode;
        const transcript = (finalTranscript || interimTranscript).trim();

        if (currentStatus === 'dictating' || currentStatus === 'voice-to-text') {
          // Show interim results in real-time
          if (interimTranscript) {
            console.log('📝 Interim transcript:', interimTranscript);
            setText(interimTranscript);
          }
          
          // When we get final result
          if (finalTranscript) {
            const finalText = finalTranscript.trim();
            console.log('✅ Final transcript:', finalText);
            
            // Stop recognition
            try {
              recognition.stop();
            } catch (e) {
              console.log('Error stopping recognition:', e);
            }
            
            if (currentMode === 'send') {
              // Voice to Send: Send immediately
              console.log('📤 Sending message immediately:', finalText);
              onSend({
                type: 'text',
                text: finalText
              });
              setText('');
              setVoiceStatus('idle');
              setVoiceMode(null);
              antMessage.success('Message sent!', 1);
            } else if (currentMode === 'text') {
              // Voice to Text: Put in input box for editing
              console.log('📝 Converting to text:', finalText);
              setText(finalText);
              setVoiceStatus('idle');
              setVoiceMode(null);
              antMessage.success('Voice converted to text. Edit and send when ready.', 2);
              // Focus the text input
              setTimeout(() => {
                textAreaRef.current?.focus();
              }, 100);
            }
          }
        }
      };

      recognition.onerror = (e) => {
        console.error('❌ Speech error:', e.error, e);
        
        if (e.error === 'no-speech') {
          console.log('⚠️ No speech detected, restarting...');
          // No speech detected - restart if still in dictating mode
          if (voiceStatus === 'dictating' || voiceStatus === 'voice-to-text') {
            setTimeout(() => {
              if (recognitionRef.current && (voiceStatus === 'dictating' || voiceStatus === 'voice-to-text')) {
                try {
                  recognitionRef.current.start();
                  console.log('🔄 Restarted after no-speech');
                } catch (err) {
                  console.log('Error restarting:', err);
                }
              }
            }, 1500);
          }
          return;
        }
        
        if (e.error === 'audio-capture') {
          antMessage.error('Microphone not found. Please check your microphone and try again.');
          setVoiceStatus('idle');
          return;
        }
        
        if (e.error === 'not-allowed') {
          antMessage.error('Microphone permission denied. Please allow microphone access in your browser settings.');
          setVoiceStatus('idle');
          return;
        }
        
        if (e.error === 'network') {
          antMessage.error('Network error. Please check your internet connection.');
          setVoiceStatus('idle');
          return;
        }
        
        if (e.error === 'aborted') {
          // User stopped it, that's fine
          console.log('Recognition aborted by user');
          return;
        }
        
        console.error('Speech recognition error:', e.error);
        antMessage.error(`Speech recognition error: ${e.error}. Please try again.`);
        
        // Only reset if it's a critical error
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          setVoiceStatus('idle');
        }
      };

      recognition.onend = () => {
        console.log('🔚 Recognition ended, current status:', voiceStatus);
        // Auto-restart if we're still in dictating mode
        if (voiceStatus === 'dictating' || voiceStatus === 'voice-to-text') {
          setTimeout(() => {
            if (recognitionRef.current && (voiceStatus === 'dictating' || voiceStatus === 'voice-to-text')) {
              try {
                recognitionRef.current.start();
                console.log('🔄 Auto-restarted recognition');
              } catch (e) {
                console.log('Auto-restart error (might already be starting):', e);
              }
            }
          }, 500);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, [voiceStatus, voiceMode, audioURL, onSend]);

  // ---------- Image compression to <= 1MB ----------
  async function compressImageToLimit(file, maxSizeBytes = 1_000_000) {
    if (!file) return null;
    
    // Quick return if already small
    if (file.size <= maxSizeBytes) return file;

    try {
      const imgBitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Resize proportionally to Max dimension while keeping quality
      const MAX_DIM = 1280; // heuristic starting point
      let { width, height } = imgBitmap;
      
      if (Math.max(width, height) > MAX_DIM) {
        const scale = MAX_DIM / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(imgBitmap, 0, 0, width, height);

      // Try decreasing quality until under limit
      let quality = 0.92;
      for (let i = 0; i < 8; ++i) {
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
        if (!blob) break;
        
        if (blob.size <= maxSizeBytes) {
          return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        }
        
        quality -= 0.12; // reduce quality
        if (quality <= 0.1) break;
      }

      // As a last resort, scale further down
      for (let scaleTry = 0.9; scaleTry >= 0.4; scaleTry -= 0.1) {
        const newWidth = Math.round(width * scaleTry);
        const newHeight = Math.round(height * scaleTry);
        canvas.width = newWidth;
        canvas.height = newHeight;
        ctx.drawImage(imgBitmap, 0, 0, newWidth, newHeight);
        
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.7));
        if (blob && blob.size <= maxSizeBytes) {
          return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        }
      }

      // Final fallback: return smallest version
      const finalBlob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.5));
      return new File([finalBlob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
    } catch (error) {
      console.error('Image compression error:', error);
      return file; // Return original if compression fails
    }
  }

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      antMessage.error('Please select an image file');
      return;
    }

    setProcessing(true);
    try {
      const compressed = await compressImageToLimit(file);
      setImageFile(compressed);
      const previewURL = URL.createObjectURL(compressed);
      setImagePreview(previewURL);
      antMessage.success(`Image compressed: ${(compressed.size / 1024).toFixed(1)}KB`);
    } catch (error) {
      console.error('Error processing image:', error);
      antMessage.error('Failed to process image');
    } finally {
      setProcessing(false);
    }
  };

  const removeImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setImageFile(null);
    if (imageFileRef.current) imageFileRef.current.value = '';
  };

  // ---------- Audio handling ----------
  const handleAudioSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      antMessage.error('Please select an audio file');
      return;
    }

    try {
      const url = URL.createObjectURL(file);
      setAudioURL(url);
      setAudioFile(file);
      setShowAudioModal(true);
      
      // Load audio to get duration
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        const duration = audio.duration;
        setAudioDuration(duration);
        setTrimLength(Math.min(30, duration));
      });
    } catch (error) {
      console.error('Error loading audio:', error);
      antMessage.error('Failed to load audio file');
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setAudioCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.currentTime = trimStart;
    }
  };

  // Trim audio using Web Audio API
  async function trimAudio(audioBuffer, startTime, duration) {
    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(startTime * sampleRate);
    const durationSamples = Math.floor(duration * sampleRate);
    const endSample = Math.min(startSample + durationSamples, audioBuffer.length);

    const trimmedBuffer = audioContextRef.current.createBuffer(
      audioBuffer.numberOfChannels,
      endSample - startSample,
      sampleRate
    );

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const trimmedData = trimmedBuffer.getChannelData(channel);
      for (let i = 0; i < trimmedData.length; i++) {
        trimmedData[i] = channelData[startSample + i];
      }
    }

    return trimmedBuffer;
  }

  async function exportTrimmedAudio() {
    if (!audioFile || !audioURL) return;

    setProcessing(true);
    try {
      // Initialize AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Load audio file
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);

      // Trim audio
      const trimmedBuffer = await trimAudio(audioBuffer, trimStart, trimLength);

      // Convert to WAV
      const wavBlob = audioBufferToWav(trimmedBuffer);
      // Use standard WAV MIME type
      const trimmedFile = new File([wavBlob], `${audioTitle || 'audio'}.wav`, { type: 'audio/wave' });

      // Send the trimmed audio
      onSend({
        type: 'audio',
        file: trimmedFile,
        title: audioTitle,
        note: audioNote,
        duration: trimLength,
        startTime: trimStart
      });

      // Reset audio state
      if (audioURL) URL.revokeObjectURL(audioURL);
      setAudioFile(null);
      setAudioURL(null);
      setAudioTitle('');
      setAudioNote('');
      setShowAudioModal(false);
      if (audioFileRef.current) audioFileRef.current.value = '';
      
      // Refocus input after sending audio
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
      
      antMessage.success('Audio trimmed and ready to send');
    } catch (error) {
      console.error('Error trimming audio:', error);
      antMessage.error('Failed to trim audio');
    } finally {
      setProcessing(false);
    }
  }

  // Convert AudioBuffer to WAV blob
  function audioBufferToWav(buffer) {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2);
    const view = new DataView(arrayBuffer);

    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * 2, true);
    view.setUint16(32, numberOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  }

  const handleSend = () => {
    if (disabled) return;

    // Send sticker
    if (selectedSticker) {
      onSend({
        type: 'sticker',
        sticker: selectedSticker
      });
      setSelectedSticker(null);
      // Refocus input after sending
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
      return;
    }

    // Send image
    if (imageFile) {
      onSend({
        type: 'image',
        file: imageFile,
        text: text.trim()
      });
      removeImage();
      setText('');
      // Refocus input after sending
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
      return;
    }

    // Send text
    if (text.trim()) {
      onSend({
        type: 'text',
        text: text.trim()
      });
      setText('');
      // Refocus input after sending
      setTimeout(() => {
        textAreaRef.current?.focus();
      }, 100);
    }
  };

  const handleStickerSelect = (sticker) => {
    setSelectedSticker(sticker);
    setShowStickerPicker(false);
    handleSend(); // Auto-send sticker
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Voice recording handlers (MediaRecorder API)
  const startVoiceRecording = async () => {
    if (isRecording) {
      stopVoiceRecording();
      return;
    }

    if (disabled || processing) return;

    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/webm'; // fallback
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Create file from blob
        const audioFile = new File([audioBlob], `voice-${Date.now()}.${mimeType.includes('webm') ? 'webm' : 'mp4'}`, {
          type: mimeType
        });
        
        // Create preview URL
        const audioURL = URL.createObjectURL(audioBlob);
        setRecordedAudioURL(audioURL);
        setRecordedAudioBlob(audioFile);
        
        // Auto-send the recorded audio
        setProcessing(true);
        try {
          onSend({
            type: 'audio',
            file: audioFile,
            title: `Voice message (${formatTime(recordingTime)})`,
            duration: recordingTime
          });
          
          // Reset state
          setRecordingTime(0);
          setRecordedAudioBlob(null);
          if (recordedAudioURL) {
            URL.revokeObjectURL(recordedAudioURL);
          }
          setRecordedAudioURL(null);
          antMessage.success('Voice message sent!', 1);
        } catch (error) {
          console.error('Error sending voice message:', error);
          antMessage.error('Failed to send voice message');
        } finally {
          setProcessing(false);
        }
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        antMessage.error('Recording error occurred');
        setIsRecording(false);
        setRecordingTime(0);
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      antMessage.info('🎤 Recording... Tap again to stop and send', 2);
    } catch (error) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        antMessage.error('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        antMessage.error('No microphone found. Please connect a microphone.');
      } else {
        antMessage.error('Failed to start recording.');
      }
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    setIsRecording(false);
  };

  // Voice input handlers
  const startVoiceToSend = async () => {
    if (!recognitionRef.current) {
      antMessage.warning('Speech recognition not supported in this browser');
      return;
    }
    
    if (voiceStatus !== 'idle') {
      // Stop current recognition
      console.log('🛑 Stopping current recognition');
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
      setVoiceStatus('idle');
      setVoiceMode(null);
      setText('');
      return;
    }

    // Request microphone permission first
    console.log('🎤 Requesting microphone permission...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('❌ Microphone permission error:', error);
      if (error.name === 'NotAllowedError') {
        antMessage.error('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        antMessage.error('No microphone found. Please connect a microphone.');
      } else {
        antMessage.error('Failed to access microphone.');
      }
      return;
    }

    console.log('🎙️ Starting voice-to-send...');
    setVoiceStatus('dictating');
    setVoiceMode('send');
    setText('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      recognitionRef.current.start();
      console.log('✅ Recognition started (voice-to-send)');
      antMessage.info('🎙️ Speak now - message will send automatically', 2);
    } catch (e) {
      console.error('❌ Error starting recognition:', e);
      if (e.message && (e.message.includes('already started') || e.message.includes('started'))) {
        return;
      }
      antMessage.error('Failed to start voice recognition.');
      setVoiceStatus('idle');
      setVoiceMode(null);
    }
  };

  const startVoiceToText = async () => {
    if (!recognitionRef.current) {
      antMessage.warning('Speech recognition not supported in this browser');
      return;
    }
    
    if (voiceStatus !== 'idle') {
      // Stop current recognition
      console.log('🛑 Stopping current recognition');
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
      setVoiceStatus('idle');
      setVoiceMode(null);
      setText('');
      return;
    }

    // Request microphone permission first
    console.log('🎤 Requesting microphone permission...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.error('❌ Microphone permission error:', error);
      if (error.name === 'NotAllowedError') {
        antMessage.error('Microphone permission denied. Please allow microphone access.');
      } else if (error.name === 'NotFoundError') {
        antMessage.error('No microphone found. Please connect a microphone.');
      } else {
        antMessage.error('Failed to access microphone.');
      }
      return;
    }

    console.log('🎙️ Starting voice-to-text...');
    setVoiceStatus('voice-to-text');
    setVoiceMode('text');
    setText('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      recognitionRef.current.start();
      console.log('✅ Recognition started (voice-to-text)');
      antMessage.info('🎙️ Speak now - text will appear for editing', 2);
    } catch (e) {
      console.error('❌ Error starting recognition:', e);
      if (e.message && (e.message.includes('already started') || e.message.includes('started'))) {
        return;
      }
      antMessage.error('Failed to start voice recognition.');
      setVoiceStatus('idle');
      setVoiceMode(null);
    }
  };

  const stopDictation = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setVoiceStatus('idle');
    setVoiceMode(null);
  };

  return (
    <div style={{ 
      borderTop: '1px solid #f0f0f0', 
      padding: '12px',
      background: '#fff'
    }}>
      {/* iOS Style Image Preview */}
      {imagePreview && (
        <div style={{ 
          marginBottom: '8px', 
          position: 'relative', 
          display: 'inline-block' 
        }}>
          <Image
            src={imagePreview}
            alt="Preview"
            width={120}
            height={120}
            style={{ 
              objectFit: 'cover', 
              borderRadius: '12px',
              border: '0.5px solid rgba(0,0,0,0.1)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={removeImage}
            shape="circle"
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              border: 'none',
              width: '28px',
              height: '28px',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          />
        </div>
      )}

      {/* iOS Style Main Input Area */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: '8px',
        background: theme.inputBg || 'rgba(255, 255, 255, 0.9)',
        borderRadius: '20px',
        padding: '6px 8px',
        border: '0.5px solid rgba(0,0,0,0.1)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: '0 -1px 2px rgba(0,0,0,0.05)'
      }}>
        {/* iOS Style Media Buttons */}
        <Space size="small" style={{ flexShrink: 0 }}>
          {/* Voice Input Buttons with Wave Effect */}
          {isSpeechSupported && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {/* Voice to Send Button */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button
                  type="text"
                  icon={<SendOutlined />}
                  onClick={startVoiceToSend}
                  disabled={disabled || processing}
                  title="Voice to Send (speak and send immediately)"
                  style={{ 
                    color: voiceStatus === 'dictating' && voiceMode === 'send'
                      ? (theme.accentColor || '#0A84FF') 
                      : '#8E8E93',
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: voiceStatus === 'dictating' && voiceMode === 'send' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    transition: 'color 0.2s ease-out',
                    position: 'relative',
                    zIndex: 2
                  }}
                />
                {/* Wave Effect for Voice to Send */}
                {voiceStatus === 'dictating' && voiceMode === 'send' && (
                  <>
                    <div className="voice-wave-container" style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: `2px solid ${theme.accentColor || '#0A84FF'}`,
                      animation: 'voiceWave 1.5s ease-out infinite',
                      opacity: 0.6,
                      zIndex: 1
                    }} />
                    <div className="voice-wave-container" style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: `2px solid ${theme.accentColor || '#0A84FF'}`,
                      animation: 'voiceWave 1.5s ease-out infinite 0.5s',
                      opacity: 0.4,
                      zIndex: 1
                    }} />
                  </>
                )}
              </div>

              {/* Voice to Text Button */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button
                  type="text"
                  icon={<AudioOutlined />}
                  onClick={startVoiceToText}
                  disabled={disabled || processing}
                  title="Voice to Text (speak and convert to text)"
                  style={{ 
                    color: voiceStatus === 'voice-to-text' && voiceMode === 'text'
                      ? (theme.accentColor || '#0A84FF') 
                      : '#8E8E93',
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: voiceStatus === 'voice-to-text' && voiceMode === 'text' ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    transition: 'color 0.2s ease-out',
                    position: 'relative',
                    zIndex: 2
                  }}
                />
                {/* Wave Effect for Voice to Text */}
                {voiceStatus === 'voice-to-text' && voiceMode === 'text' && (
                  <>
                    <div className="voice-wave-container" style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: `2px solid ${theme.accentColor || '#0A84FF'}`,
                      animation: 'voiceWave 1.5s ease-out infinite',
                      opacity: 0.6,
                      zIndex: 1
                    }} />
                    <div className="voice-wave-container" style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: `2px solid ${theme.accentColor || '#0A84FF'}`,
                      animation: 'voiceWave 1.5s ease-out infinite 0.5s',
                      opacity: 0.4,
                      zIndex: 1
                    }} />
                  </>
                )}
              </div>

              {/* Voice Recording Button (MediaRecorder) */}
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Button
                  type="text"
                  icon={isRecording ? <StopOutlined /> : <SoundOutlined />}
                  onClick={startVoiceRecording}
                  disabled={disabled || processing || (voiceStatus !== 'idle')}
                  title={isRecording ? `Recording... ${formatTime(recordingTime)} - Tap to stop and send` : "Voice Record (record and send audio)"}
                  style={{ 
                    color: isRecording
                      ? '#ff4d4f' 
                      : '#8E8E93',
                    width: '32px',
                    height: '32px',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
                    transition: 'color 0.2s ease-out',
                    position: 'relative',
                    zIndex: 2
                  }}
                />
                {/* Wave Effect for Voice Recording */}
                {isRecording && (
                  <>
                    <div className="voice-wave-container" style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid #ff4d4f',
                      animation: 'voiceWave 1.5s ease-out infinite',
                      opacity: 0.6,
                      zIndex: 1
                    }} />
                    <div className="voice-wave-container" style={{
                      position: 'absolute',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid #ff4d4f',
                      animation: 'voiceWave 1.5s ease-out infinite 0.5s',
                      opacity: 0.4,
                      zIndex: 1
                    }} />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Recording Timer Display */}
          {isRecording && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 12px',
              background: 'rgba(255, 77, 79, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 77, 79, 0.3)',
              fontSize: '13px',
              color: '#ff4d4f',
              fontWeight: 500,
              flexShrink: 0
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#ff4d4f',
                animation: 'pulse 1s ease-in-out infinite'
              }} />
              <span>{formatTime(recordingTime)}</span>
            </div>
          )}

          <input
            ref={imageFileRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            style={{ display: 'none' }}
          />
          <Button
            type="text"
            icon={<PictureOutlined />}
            onClick={() => imageFileRef.current?.click()}
            disabled={disabled || processing || voiceStatus !== 'idle'}
            style={{ 
              color: '#8E8E93',
              width: '32px',
              height: '32px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />

          <Button
            type="text"
            icon={<SmileOutlined />}
            onClick={() => setShowStickerPicker(!showStickerPicker)}
            disabled={disabled || voiceStatus !== 'idle'}
            style={{ 
              color: showStickerPicker ? (theme.accentColor || '#0A84FF') : '#8E8E93',
              width: '32px',
              height: '32px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s ease-out'
            }}
          />

          <input
            ref={audioFileRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioSelect}
            style={{ display: 'none' }}
          />
          <Button
            type="text"
            icon={<SoundOutlined />}
            onClick={() => audioFileRef.current?.click()}
            disabled={disabled || processing || voiceStatus !== 'idle'}
            style={{ 
              color: '#8E8E93',
              width: '32px',
              height: '32px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        </Space>

        {/* Text Input */}
        <TextArea
          ref={textAreaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            // If user manually edits during voice input, cancel voice mode
            if (voiceStatus !== 'idle') {
              setVoiceStatus('idle');
              setVoiceMode(null);
            }
          }}
          placeholder={voiceStatus === 'dictating' || voiceStatus === 'voice-to-text' ? 'Listening...' : placeholder}
          autoSize={{ minRows: 1, maxRows: 4 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={disabled || processing || voiceStatus === 'dictating'}
          style={{
            border: 'none',
            background: 'transparent',
            boxShadow: 'none',
            resize: 'none',
            fontSize: '17px',
            padding: '4px 8px',
            flex: 1,
            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
            lineHeight: '1.35'
          }}
        />

        {/* iOS Style Send Button */}
        {(text.trim() || imageFile || selectedSticker) ? (
          <Button
            type="primary"
            shape="circle"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={disabled || processing}
            loading={processing}
            style={{
              flexShrink: 0,
              width: '32px',
              height: '32px',
              minWidth: '32px',
              padding: 0,
              background: theme.accentColor || '#0A84FF',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          />
        ) : (
          <Button
            type="text"
            icon={<SendOutlined />}
            disabled
            style={{
              flexShrink: 0,
              color: '#C7C7CC',
              padding: '4px 8px',
              width: '32px',
              height: '32px',
              minWidth: '32px'
            }}
          />
        )}
      </div>

      {/* Voice Input Status Message with Wave Visualization */}
      {voiceStatus !== 'idle' && (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          background: 'rgba(10, 132, 255, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(10, 132, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Audio Wave Visualization */}
            <div className="audio-wave" style={{
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              height: '24px'
            }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    width: '3px',
                    height: '100%',
                    background: theme.accentColor || '#0A84FF',
                    borderRadius: '2px',
                    animation: `waveBar ${0.6 + i * 0.1}s ease-in-out infinite`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
            <Text style={{ 
              fontSize: '13px', 
              color: '#0A84FF',
              flex: 1
            }}>
              {voiceMode === 'send' && '🎙️ Listening... Speak and message will send automatically.'}
              {voiceMode === 'text' && '🎙️ Listening... Speak and text will appear for editing.'}
            </Text>
          </div>
          <Button
            type="text"
            size="small"
            onClick={stopDictation}
            style={{ 
              color: '#0A84FF',
              padding: '4px 8px',
              height: 'auto',
              flexShrink: 0
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* iOS Style Sticker Picker */}
      {showStickerPicker && (
        <div style={{
          marginTop: '8px',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '0.5px solid rgba(0,0,0,0.1)',
          borderRadius: '16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          {stickers.map((sticker, idx) => (
            <Button
              key={idx}
              type="text"
              onClick={() => handleStickerSelect(sticker)}
              style={{
                fontSize: '28px',
                height: '44px',
                padding: 0,
                border: selectedSticker === sticker 
                  ? `2px solid ${theme.accentColor || '#0A84FF'}` 
                  : '0.5px solid rgba(0,0,0,0.1)',
                borderRadius: '8px',
                transition: 'all 0.2s ease-out',
                background: selectedSticker === sticker 
                  ? 'rgba(10, 132, 255, 0.1)' 
                  : 'transparent'
              }}
            >
              {sticker}
            </Button>
          ))}
        </div>
      )}

      {/* Audio Trim Modal */}
      <Modal
        title="Trim Audio"
        open={showAudioModal}
        onCancel={() => {
          setShowAudioModal(false);
          if (audioURL) {
            URL.revokeObjectURL(audioURL);
            setAudioURL(null);
          }
          setAudioFile(null);
          if (audioFileRef.current) audioFileRef.current.value = '';
        }}
        onOk={exportTrimmedAudio}
        okText="Send Trimmed Audio"
        cancelText="Cancel"
        okButtonProps={{ loading: processing }}
        width={600}
      >
        {audioURL && (
          <div>
            {/* Audio Player */}
            <div style={{ marginBottom: '16px', textAlign: 'center' }}>
              <audio
                ref={audioRef}
                src={audioURL}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleAudioEnded}
                onLoadedMetadata={() => {
                  if (audioRef.current) {
                    setAudioDuration(audioRef.current.duration);
                    setTrimLength(Math.min(30, audioRef.current.duration));
                  }
                }}
                style={{ display: 'none' }}
              />
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Button
                  type="primary"
                  icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  onClick={handlePlayPause}
                  size="large"
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                </div>
              </Space>
            </div>

            {/* Trim Controls */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Start Time (seconds):</strong>
                <Slider
                  min={0}
                  max={Math.max(0, audioDuration - trimLength)}
                  value={trimStart}
                  onChange={setTrimStart}
                  step={0.1}
                  style={{ marginTop: '8px' }}
                />
                <div style={{ textAlign: 'center', marginTop: '4px', color: '#666' }}>
                  {formatTime(trimStart)}
                </div>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <strong>Duration (seconds):</strong>
                <Slider
                  min={1}
                  max={Math.min(60, audioDuration - trimStart)}
                  value={trimLength}
                  onChange={setTrimLength}
                  step={0.1}
                  style={{ marginTop: '8px' }}
                />
                <div style={{ textAlign: 'center', marginTop: '4px', color: '#666' }}>
                  {formatTime(trimLength)}
                </div>
              </div>
            </div>

            {/* Audio Title and Note */}
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Input
                placeholder="Audio title (optional)"
                value={audioTitle}
                onChange={(e) => setAudioTitle(e.target.value)}
              />
              <TextArea
                placeholder="Add a note (optional)"
                value={audioNote}
                onChange={(e) => setAudioNote(e.target.value)}
                rows={2}
              />
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
}

