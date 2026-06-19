export default function Learning() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Learning Center</h1>
      <p className="text-gray-600">Explore videos, quizzes, and study materials</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold mb-2">Video Lessons</h3>
          <p className="text-gray-600 text-sm">Watch curated video content</p>
        </div>
        
        <div className="card hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold mb-2">Practice Quizzes</h3>
          <p className="text-gray-600 text-sm">Test your knowledge</p>
        </div>
        
        <div className="card hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="text-lg font-semibold mb-2">Study Materials</h3>
          <p className="text-gray-600 text-sm">Access notes and resources</p>
        </div>
      </div>
    </div>
  )
}
