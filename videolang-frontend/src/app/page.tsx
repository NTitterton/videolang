import VideoUpload from '@/components/VideoUpload'
import VideoList from '@/components/VideoList'

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold mb-8">VideoLang</h1>
        <VideoUpload />
        <VideoList />
      </div>
    </main>
  )
}
