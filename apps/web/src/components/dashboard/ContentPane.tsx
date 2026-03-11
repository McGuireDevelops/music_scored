interface ContentPaneProps {
  breadcrumb?: string;
  title?: string;
  children: React.ReactNode;
}

export function ContentPane({ breadcrumb, title, children }: ContentPaneProps) {
  return (
    <div className="min-w-0 flex-1 overflow-hidden">
      {breadcrumb && (
        <span className="mb-3 inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {breadcrumb}
        </span>
      )}
      {title && (
        <h2 className="mb-4 text-xl font-semibold tracking-tight text-gray-900 underline decoration-primary decoration-2 underline-offset-4">
          {title}
        </h2>
      )}
      <div className="rounded-card min-h-0 overflow-auto border border-gray-200 bg-white p-6 shadow-card">
        {children}
      </div>
    </div>
  );
}
