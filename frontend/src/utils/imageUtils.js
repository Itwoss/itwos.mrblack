/**
 * Image utility functions for cropping, rotating, and processing images
 */

export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })

export const getRadianAngle = (degreeValue) => {
  return (degreeValue * Math.PI) / 180
}

export const rotateSize = (width, height, rotation) => {
  const rotRad = getRadianAngle(rotation)
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  }
}

export const getCroppedImg = async (
  imageSrc,
  pixelCrop,
  rotation = 0,
  circularCrop = false
) => {
  const image = await createImage(imageSrc)
  
  // Create canvas for the full image with rotation
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // If there's rotation, we need to handle it
  if (rotation !== 0) {
    const rotRad = getRadianAngle(rotation)
    
    // Calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
      image.width,
      image.height,
      rotation
    )

    // Set canvas size to match bounding box
    canvas.width = bBoxWidth
    canvas.height = bBoxHeight

    // Translate canvas context to a central location to allow rotating around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(rotRad)
    ctx.translate(-image.width / 2, -image.height / 2)

    // Draw rotated image
    ctx.drawImage(image, 0, 0)
  } else {
    // No rotation, just draw the image
    canvas.width = image.width
    canvas.height = image.height
    ctx.drawImage(image, 0, 0)
  }

  // Create a new canvas for the final cropped image
  const croppedCanvas = document.createElement('canvas')
  const croppedCtx = croppedCanvas.getContext('2d')

  if (!croppedCtx) {
    throw new Error('No 2d context for cropped canvas')
  }

  // Set canvas size to final desired crop size
  croppedCanvas.width = pixelCrop.width
  croppedCanvas.height = pixelCrop.height

  // Ensure crop coordinates are within bounds
  const cropX = Math.max(0, Math.min(pixelCrop.x, canvas.width - pixelCrop.width))
  const cropY = Math.max(0, Math.min(pixelCrop.y, canvas.height - pixelCrop.height))
  const cropWidth = Math.min(pixelCrop.width, canvas.width - cropX)
  const cropHeight = Math.min(pixelCrop.height, canvas.height - cropY)

  // Draw the cropped portion from the canvas
  try {
    croppedCtx.drawImage(
      canvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )
  } catch (error) {
    console.error('Error drawing cropped image:', error)
    throw new Error('Failed to crop image: ' + error.message)
  }

  // If circular crop, apply mask
  if (circularCrop) {
    croppedCtx.globalCompositeOperation = 'destination-in'
    croppedCtx.beginPath()
    croppedCtx.arc(
      pixelCrop.width / 2,
      pixelCrop.height / 2,
      Math.min(pixelCrop.width, pixelCrop.height) / 2,
      0,
      Math.PI * 2
    )
    croppedCtx.fill()
  }

  return new Promise((resolve, reject) => {
    croppedCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Canvas is empty'))
        return
      }
      const fileUrl = URL.createObjectURL(blob)
      resolve(fileUrl)
    }, 'image/jpeg', 0.9)
  })
}

export const getRotatedImage = async (imageSrc, rotation = 0) => {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  const rotRad = getRadianAngle(rotation)

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  )

  // Set canvas size to match bounding box
  canvas.width = bBoxWidth
  canvas.height = bBoxHeight

  // Translate canvas context to a central location to allow rotating around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
  ctx.rotate(rotRad)
  ctx.translate(-image.width / 2, -image.height / 2)

  // Draw rotated image
  ctx.drawImage(image, 0, 0)

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Canvas is empty')
        return
      }
      const fileUrl = URL.createObjectURL(blob)
      resolve(fileUrl)
    }, 'image/jpeg', 0.9)
  })
}
