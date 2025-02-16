'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { API_URL } from '@/config'

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle')

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
      setUploadStatus('idle')  // Reset status when new file selected
    }

    video.src = URL.createObjectURL(videoFile)
  }

  const handleSubmit = async () => {
    if (!file) return

    setUploadStatus('uploading')
    const currentFile = file // Keep a reference to the current file
    
    try {
      // Get pre-signed URL
      const response = await fetch(`${API_URL}/api/videos/upload_url/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: `${Date.now()}-${currentFile.name}`,
        }),
      })

      if (!response.ok) throw new Error('Failed to get upload URL')

      const data = await response.json()
      
      // Upload to S3
      const uploadResponse = await fetch(data.upload_url, {
        method: 'PUT',
        body: currentFile,
        headers: {
          'Content-Type': currentFile.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      // Clear the UI immediately after successful S3 upload
      resetFileInput()
      setFile(null)
      setUploadStatus('idle')

      // Create video record (don't wait for this to reset UI)
      fetch(`${API_URL}/api/videos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentFile.name,
          file_url: data.file_url,
        }),
      }).catch(error => {
        console.error('Error creating video record:', error)
      })
      
    } catch (error) {
      console.error('Upload error:', error)
      resetFileInput()
      setFile(null)
      setUploadStatus('error')
    }
  }

  // Also clear the file input value after upload
  const resetFileInput = () => {
    const input = document.getElementById('video-upload') as HTMLInputElement
    if (input) {
      input.value = ''
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
          disabled={uploadStatus === 'uploading'}
          className="w-full"
        >
          {uploadStatus === 'uploading' ? 'Uploading...' : 'Process Video'}
        </Button>
      )}
    </div>
  )
} 