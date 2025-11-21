import React, { useState, useCallback, useEffect } from 'react'
import { Modal, Button, Slider, Space, message, Row, Col } from 'antd'
import { 
  RotateLeftOutlined, 
  RotateRightOutlined, 
  ZoomInOutlined,
  CheckOutlined,
  CloseOutlined,
  SwapOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '../utils/imageUtils'

const ImageEditor = ({ 
  visible, 
  imageSrc, 
  onCancel, 
  onSave,
  aspect = 1,
  circularCrop = false
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [loading, setLoading] = useState(false)

  // Reset state when image changes
  useEffect(() => {
    if (imageSrc) {
      setCrop({ x: 0, y: 0 })
      setZoom(1)
      setRotation(0)
      setBrightness(100)
      setContrast(100)
      setSaturation(100)
      setCroppedAreaPixels(null)
    }
  }, [imageSrc])

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    if (croppedAreaPixels) {
      setCroppedAreaPixels(croppedAreaPixels)
    }
  }, [])

  const handleRotate = (direction) => {
    setRotation(prev => direction === 'left' ? prev - 90 : prev + 90)
  }

  const handleReset = () => {
    setRotation(0)
    setZoom(1)
    setBrightness(100)
    setContrast(100)
    setSaturation(100)
    setCrop({ x: 0, y: 0 })
  }

  const applyFilters = (imageUrl) => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        
        // Apply filters
        ctx.filter = `
          brightness(${brightness}%) 
          contrast(${contrast}%) 
          saturate(${saturation}%)
        `
        ctx.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to apply filters'))
            return
          }
          const fileUrl = URL.createObjectURL(blob)
          resolve(fileUrl)
        }, 'image/jpeg', 0.9)
      }
      img.onerror = () => reject(new Error('Failed to load image'))
      img.src = imageUrl
    })
  }

  const handleSave = async () => {
    if (!imageSrc) {
      message.error('Please select an image first')
      return
    }

    // If no crop area is set yet, wait a bit for it to be calculated
    if (!croppedAreaPixels) {
      message.warning('Please wait for image to load completely')
      return
    }

    try {
      setLoading(true)
      
      console.log('Starting image processing...', {
        hasImageSrc: !!imageSrc,
        croppedAreaPixels,
        rotation,
        brightness,
        contrast,
        saturation
      })

      // First apply color filters if needed
      let processedImage = imageSrc
      if (brightness !== 100 || contrast !== 100 || saturation !== 100) {
        console.log('Applying color filters...')
        processedImage = await applyFilters(imageSrc)
        console.log('Color filters applied')
      }

      // Then crop and rotate
      console.log('Cropping and rotating image...')
      const croppedImageUrl = await getCroppedImg(
        processedImage,
        croppedAreaPixels,
        rotation,
        circularCrop
      )
      console.log('Image cropped successfully')

      // Convert blob URL to File for upload
      console.log('Converting to file...')
      const response = await fetch(croppedImageUrl)
      if (!response.ok) {
        throw new Error('Failed to fetch cropped image')
      }
      const blob = await response.blob()
      if (!blob || blob.size === 0) {
        throw new Error('Cropped image is empty')
      }
      const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' })
      console.log('File created:', file.size, 'bytes')

      onSave(file, croppedImageUrl)
    } catch (error) {
      console.error('Error processing image:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      message.error(`Failed to process image: ${error.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      title="Edit Profile Image"
      width={800}
      footer={null}
      styles={{
        body: {
          padding: '24px'
        }
      }}
    >
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '400px',
            background: '#f0f0f0',
            borderRadius: '8px',
            overflow: 'hidden'
          }}
        >
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              cropShape={circularCrop ? 'round' : 'rect'}
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  position: 'relative'
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          {/* Zoom Control */}
          <Col xs={24} sm={12}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ZoomInOutlined />
                <span style={{ fontWeight: 500 }}>Zoom</span>
                <span style={{ color: '#666', fontSize: '12px' }}>({Math.round(zoom * 100)}%)</span>
              </div>
              <Slider
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={setZoom}
                tooltip={{ formatter: (value) => `${Math.round(value * 100)}%` }}
              />
            </div>
          </Col>

          {/* Rotation Control */}
          <Col xs={24} sm={12}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SwapOutlined />
                <span style={{ fontWeight: 500 }}>Rotation</span>
                <span style={{ color: '#666', fontSize: '12px' }}>({rotation}°)</span>
              </div>
              <Space>
                <Button 
                  icon={<RotateLeftOutlined />} 
                  onClick={() => handleRotate('left')}
                  size="small"
                >
                  Left
                </Button>
                <Button 
                  icon={<RotateRightOutlined />} 
                  onClick={() => handleRotate('right')}
                  size="small"
                >
                  Right
                </Button>
                <Button onClick={handleReset} size="small">
                  Reset
                </Button>
              </Space>
            </div>
          </Col>

          {/* Brightness Control */}
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 500 }}>Brightness</span>
                <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>({brightness}%)</span>
              </div>
              <Slider
                min={0}
                max={200}
                value={brightness}
                onChange={setBrightness}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </div>
          </Col>

          {/* Contrast Control */}
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 500 }}>Contrast</span>
                <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>({contrast}%)</span>
              </div>
              <Slider
                min={0}
                max={200}
                value={contrast}
                onChange={setContrast}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </div>
          </Col>

          {/* Saturation Control */}
          <Col xs={24} sm={8}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontWeight: 500 }}>Saturation</span>
                <span style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>({saturation}%)</span>
              </div>
              <Slider
                min={0}
                max={200}
                value={saturation}
                onChange={setSaturation}
                tooltip={{ formatter: (value) => `${value}%` }}
              />
            </div>
          </Col>
        </Row>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
        <Button onClick={onCancel} icon={<CloseOutlined />}>
          Cancel
        </Button>
        <Button 
          type="primary" 
          onClick={handleSave}
          icon={<CheckOutlined />}
          loading={loading}
        >
          Save Changes
        </Button>
      </div>
    </Modal>
  )
}

export default ImageEditor

