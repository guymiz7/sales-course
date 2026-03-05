'use client'
export default function VideoPlayer({ fileId }: { fileId: string }) {
  if (!fileId) {
    return (
      <div className="w-full aspect-video bg-gray-100 rounded-xl flex items-center justify-center">
        <p className="text-gray-400 text-sm">הסרטון טרם הועלה</p>
      </div>
    )
  }

  const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`

  return (
    <div className="w-full aspect-video bg-black rounded-xl overflow-hidden shadow-sm">
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        allow="autoplay"
        allowFullScreen
        className="w-full h-full"
        // Prevent right-click context menu to discourage download attempts
        onContextMenu={e => e.preventDefault()}
      />
    </div>
  )
}
