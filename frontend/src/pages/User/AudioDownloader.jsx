import React, { useState } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Space, 
  Typography, 
  List, 
  message, 
  Spin,
  Alert,
  Divider
} from 'antd';
import { 
  DownloadOutlined, 
  LinkOutlined, 
  DeleteOutlined,
  PlayCircleOutlined,
  SoundOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text } = Typography;
const { TextArea } = Input;

const AudioDownloader = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadedFiles, setDownloadedFiles] = useState([]);

  const handleDownload = async () => {
    if (!url.trim()) {
      message.warning('Please enter a YouTube URL');
      return;
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(url.trim())) {
      message.error('Please enter a valid YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/audio/download', {
        url: url.trim()
      });

      if (response.data.success) {
        const audioUrl = response.data.url || response.data.data?.url;
        const fileName = response.data.filename || response.data.data?.filename || 'audio.mp3';
        const title = response.data.title || response.data.data?.title || 'Downloaded Audio';

        // Add to downloaded files list
        const newFile = {
          id: Date.now(),
          url: audioUrl,
          fileName: fileName,
          title: title,
          downloadUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:7000'}${audioUrl}`
        };

        setDownloadedFiles(prev => [newFile, ...prev]);
        setUrl('');
        message.success('Audio downloaded successfully!');
      } else {
        message.error(response.data.error || 'Failed to download audio');
      }
    } catch (error) {
      console.error('Download error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to download audio';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    setDownloadedFiles(prev => prev.filter(file => file.id !== id));
    message.success('File removed from list');
  };

  const handlePlay = (downloadUrl) => {
    window.open(downloadUrl, '_blank');
  };

  const handleDownloadFile = (downloadUrl, fileName) => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Download started!');
  };

  return (
    <div style={{ 
      padding: '24px',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '100vh',
      background: '#f5f5f5'
    }}>
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              <SoundOutlined /> Audio Downloader
            </Title>
            <Text type="secondary">
              Download audio from YouTube videos and convert to high-quality MP3 (320kbps)
            </Text>
          </div>

          <Alert
            message="How to use"
            description="Paste a YouTube video URL and click Download. The audio will be extracted and converted to MP3 format."
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPressEnter={handleDownload}
              prefix={<LinkOutlined />}
              size="large"
              style={{ flex: 1 }}
              disabled={loading}
            />
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={loading}
              size="large"
            >
              Download
            </Button>
          </Space.Compact>

          {loading && (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '16px' }}>
                <Text>Downloading and converting audio... This may take a moment.</Text>
              </div>
            </div>
          )}
        </Space>
      </Card>

      {downloadedFiles.length > 0 && (
        <Card>
          <Title level={4} style={{ marginBottom: '16px' }}>
            Downloaded Files ({downloadedFiles.length})
          </Title>
          <List
            dataSource={downloadedFiles}
            renderItem={(file) => (
              <List.Item
                actions={[
                  <Button
                    key="play"
                    type="text"
                    icon={<PlayCircleOutlined />}
                    onClick={() => handlePlay(file.downloadUrl)}
                    title="Play audio"
                  />,
                  <Button
                    key="download"
                    type="text"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownloadFile(file.downloadUrl, file.fileName)}
                    title="Download file"
                  />,
                  <Button
                    key="delete"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleDelete(file.id)}
                    title="Remove from list"
                  />
                ]}
              >
                <List.Item.Meta
                  avatar={<SoundOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                  title={file.title || file.fileName}
                  description={
                    <Space>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {file.fileName}
                      </Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {downloadedFiles.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <SoundOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
            <Text type="secondary">No downloaded files yet. Start by downloading an audio file above.</Text>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AudioDownloader;
