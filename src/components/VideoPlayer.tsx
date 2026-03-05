'use client'
import { useState } from 'react'

export default function VideoPlayer({ fileId }: { fileId: string }) {
  const [showHelp, setShowHelp] = useState(false)

  if (!fileId) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 text-sm">הסרטון טרם הועלה</p>
      </div>
    )
  }

  const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`

  return (
    <div>
      <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-sm relative">
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          allow="autoplay"
          allowFullScreen
          className="w-full h-full"
          onContextMenu={e => e.preventDefault()}
        />
        {/* Block the Google Drive download/open button in top-right corner */}
        <div className="absolute top-0 right-0 w-12 h-12 z-10" />
      </div>
      <div className="mt-2 text-right">
        <button
          onClick={() => setShowHelp(h => !h)}
          className="text-xs text-gray-400 hover:text-gray-600 transition"
        >
          הסרטון לא נטען?
        </button>
        {showHelp && (
          <div className="mt-1 p-3 bg-amber-50 border border-amber-200 rounded-lg text-right">
            <p className="text-sm text-amber-800 mb-1">
              הסרטון דורש חשבון Google פעיל.
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>התחבר לחשבון Google שלך בדפדפן</li>
              <li>אם אתה במצב גלישה פרטית — פתח בחלון רגיל</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
