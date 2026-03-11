import { useTenant } from "../contexts/TenantContext";

/** Branded layout for unauthenticated users: purple brand strip + content. No app nav. */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  const { branding } = useTenant();
  const name = branding.tenantName ?? "Learning Scores";
  const tagline = "Professional Film Music Learning Platform by McGuireDevelops";

  return (
    <div className="flex min-h-screen">
      {/* Brand panel - matches sidebar style, no nav items */}
      <aside className="hidden w-72 flex-shrink-0 flex-col bg-sidebar lg:flex">
        <div className="flex flex-1 flex-col justify-center px-10">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="" className="mb-4 h-12 w-auto object-contain" />
          ) : null}
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {name}
          </h1>
          <p className="mt-3 text-lg text-white/80">
            {tagline}
          </p>
        </div>
      </aside>
      {/* Content area */}
      <main className="flex flex-1 flex-col items-center justify-center bg-surface-light px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="mb-2 h-10 w-auto object-contain" />
            ) : null}
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              {name}
            </h1>
            <p className="mt-1 text-gray-600">
              {tagline}
            </p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
