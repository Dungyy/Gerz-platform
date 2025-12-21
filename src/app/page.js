import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-2xl px-4">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Gerz
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Property Maintenance Management Platform
        </p>
        <div className="flex gap-4 justify-center">
          <Link 
            href="/login"
            className="px-8 py-4 bg-blue-600 text-white text-lg rounded-lg hover:bg-blue-700"
          >
            Sign In
          </Link>
          <Link 
            href="/signup"
            className="px-8 py-4 border-2 border-gray-300 text-lg rounded-lg hover:bg-gray-50"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  )
}