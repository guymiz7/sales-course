export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded-lg w-1/3" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
      <div className="h-64 bg-gray-100 rounded-xl mt-6" />
    </div>
  )
}
