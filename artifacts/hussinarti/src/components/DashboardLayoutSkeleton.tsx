export default function DashboardLayoutSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 animate-pulse">
      <div className="h-24 bg-gray-200 shadow-lg" />
      <div className="h-16 bg-white border-b border-gray-200" />
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-6 h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg p-6 h-64" />
          <div className="bg-white rounded-lg p-6 h-64" />
        </div>
      </div>
    </div>
  );
}
