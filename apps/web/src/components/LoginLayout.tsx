/** Branded layout for unauthenticated users: purple brand strip + content. No app nav. */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel - matches sidebar style, no nav items */}
      <aside className="hidden w-72 flex-shrink-0 flex-col bg-sidebar lg:flex">
        <div className="flex flex-1 flex-col justify-center px-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Learning Scores
          </h1>
          <p className="mt-3 text-lg text-white/80">
            Professional Film Music Learning Platform by McGuireDevelops
          </p>
        </div>
      </aside>
      {/* Content area */}
      <main className="flex flex-1 flex-col items-center justify-center bg-surface-light px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Learning Scores
            </h1>
            <p className="mt-1 text-gray-600">
              Professional Film Music Learning Platform by McGuireDevelops
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
