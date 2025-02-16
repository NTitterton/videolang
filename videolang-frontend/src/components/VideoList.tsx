'use client'

import { useEffect, useState, useRef } from 'react'
import { Button } from './ui/button'

interface Video {
  id: number
  title: string
  file_url: string
  transcript: string | null
  processed: boolean
  uploaded_at: string
  processing_status: string
  processing_progress: number
}

interface Answer {
  answer: string;
  timestamp: number;
}

interface QA {
  question: string;
  answer: string;
  timestamp: number;
}

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const selectedVideoIdRef = useRef<number | null>(null)
  const [question, setQuestion] = useState('')
  const [qaHistory, setQaHistory] = useState<QA[]>([])
  const [loading, setLoading] = useState(false)

  const fetchVideos = () => {
    fetch('http://localhost:8000/api/videos/')
      .then(res => res.json())
      .then(data => {
        console.log('Videos:', data);
        setVideos(data)
        // Update selectedVideo if it exists
        if (selectedVideoIdRef.current) {
          const updatedVideo = data.find((v: Video) => v.id === selectedVideoIdRef.current)
          if (updatedVideo && updatedVideo.processed !== selectedVideo?.processed) {
            setSelectedVideo(updatedVideo)
          }
        }
      })
  }

  useEffect(() => {
    fetchVideos()
    // Refresh every 5 seconds
    const interval = setInterval(fetchVideos, 5000)
    return () => clearInterval(interval)
  }, []) // Empty dependency array

  const handleVideoSelect = (video: Video) => {
    setSelectedVideo(video)
    selectedVideoIdRef.current = video.id
    setQuestion('')
    setQaHistory([])  // Clear history when switching videos
  }

  const askQuestion = async () => {
    if (!selectedVideo || !question) return
    setLoading(true)
    try {
      const response = await fetch(
        `http://localhost:8000/api/videos/${selectedVideo.id}/ask/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ question }),
        }
      )
      
      if (!response.ok) throw new Error('Failed to get answer')
      
      const data = await response.json()
      setQaHistory(prev => [...prev, { 
        question, 
        answer: data.answer, 
        timestamp: data.timestamp 
      }])
      setQuestion('')
    } catch (error) {
      console.error('Error asking question:', error)
      alert('Failed to get answer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">Your Videos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map(video => (
          <div 
            key={video.id} 
            className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
              selectedVideo?.id === video.id ? 'border-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => handleVideoSelect(video)}
          >
            <h3 className="font-medium">{video.title}</h3>
            <p className="text-sm text-gray-500">
              Status: {
                video.processed 
                  ? 'Ready for questions'
                  : video.processing_status === 'downloading'
                    ? 'Loading video for analysis'
                    : video.processing_status.startsWith('analyzing frames')
                      ? `Analyzing video: frame ${video.processing_status.split('frames ')[1]}`
                      : video.processing_status === 'transcribing'
                        ? 'Creating transcript'
                        : video.processing_status
              }
            </p>
            <p className="text-xs text-gray-400">
              Uploaded: {new Date(video.uploaded_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {selectedVideo && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">
            {selectedVideo.title}
          </h3>
          {selectedVideo.file_url && (
            <video 
              src={selectedVideo.file_url} 
              controls 
              className="w-full rounded-lg"
            />
          )}
          
          <div className="space-y-4">
            {qaHistory.length > 0 && (
              <div className="space-y-4">
                {qaHistory.map((qa, index) => (
                  <div key={index} className="space-y-2">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Question:</h4>
                      <p>{qa.question}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Answer:</h4>
                      <p>{qa.answer}</p>
                      {qa.timestamp > 0 && (
                        <p className="text-sm text-gray-500 mt-2">
                          Timestamp: {qa.timestamp} seconds
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask a question about the video..."
                className="w-full p-2 border rounded-lg"
                rows={3}
              />
              <Button 
                onClick={askQuestion}
                disabled={!selectedVideo.processed || loading}
              >
                {loading ? 'Thinking...' : 'Ask Question'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 