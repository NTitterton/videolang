import { Button } from '@/components/ui/button'
import VideoUpload from '@/components/VideoUpload'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">VideoLang</h1>
        <div className="space-y-8">
          <VideoUpload />
        </div>
      </div>
    </main>
  )
}
