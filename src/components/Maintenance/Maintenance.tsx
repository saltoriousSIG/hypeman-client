export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-8 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-12 w-24 h-24 bg-pink-400/40 rounded-full blur-2xl animate-bounce"></div>
        <div className="absolute bottom-40 right-16 w-40 h-40 bg-blue-500/25 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-60 left-12 w-20 h-20 bg-purple-400/35 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6">
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-8 md:p-12 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-400 via-pink-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/25">
            <svg
              className="w-12 h-12 text-white animate-spin"
              style={{ animationDuration: "3s" }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
            Under Maintenance
          </h1>

          <p className="text-lg md:text-xl text-white/80 mb-6 leading-relaxed">
            We're performing some awesome updates to make your experience even better!
          </p>

          <p className="text-sm text-white/60 mb-8">
            We'll be back shortly. Thanks for your patience while we level up the platform.
          </p>

          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-400/30 rounded-full px-6 py-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-purple-300">Updates in progress</span>
          </div>
        </div>
      </div>
    </div>
  )
}

