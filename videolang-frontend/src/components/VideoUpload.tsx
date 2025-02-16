'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const videoFile = files[0]
    // Create a video element to check duration
    const video = document.createElement('video')
    video.preload = 'metadata'

    video.onloadedmetadata = function() {
      window.URL.revokeObjectURL(video.src)
      if (video.duration > 180) { // 3 minutes in seconds
        alert('Video must be 3 minutes or shorter')
        return
      }
      setFile(videoFile)
    }

    video.src = URL.createObjectURL(videoFile)
  }

  const handleSubmit = async () => {
    if (!file) return

    setUploading(true)
    try {
      // Get pre-signed URL
      const response = await fetch('http://localhost:8000/api/videos/upload_url/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: `${Date.now()}-${file.name}`,
        }),
      })

      if (!response.ok) throw new Error('Failed to get upload URL')

      const data = await response.json()
      console.log('Upload URLs:', {
        upload_url: data.upload_url,
        file_url: data.file_url,
        bucket: data.upload_url.split('/')[2].split('.')[0]  // Extract bucket name from URL
      })

      const { upload_url, file_url } = data

      // Upload to S3
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('S3 Upload Error:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText
        });
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      // Create video record
      const videoResponse = await fetch('http://localhost:8000/api/videos/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: file.name,
          file_url: file_url,
        }),
      })

      if (!videoResponse.ok) throw new Error('Failed to create video record')

      alert('Upload successful!')
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          accept="video/*"
          onChange={handleUpload}
          className="hidden"
          id="video-upload"
        />
        <label htmlFor="video-upload" className="cursor-pointer">
          <div className="space-y-2">
            {file ? (
              <p className="text-lg">Selected: {file.name}</p>
            ) : (
              <>
                <p className="text-lg">Drop your video here or click to upload</p>
                <p className="text-sm text-gray-500">Maximum duration: 3 minutes</p>
              </>
            )}
          </div>
        </label>
      </div>
      {file && (
        <Button 
          onClick={handleSubmit} 
          disabled={uploading}
          className="w-full"
        >
          {uploading ? 'Uploading...' : 'Process Video'}
        </Button>
      )}
    </div>
  )
} 