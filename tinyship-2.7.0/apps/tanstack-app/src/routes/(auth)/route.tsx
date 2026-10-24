import { createFileRoute, Link, Outlet, redirect } from '@tanstack/react-router'
import { siteCopy } from '@/lib/site-copy'

export const Route = createFileRoute('/(auth)')({
  beforeLoad: () => {
    throw redirect({ to: '/', statusCode: 301 })
  },
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="bg-muted flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link to="/" className="self-center">
          <span className="text-lg font-semibold">{siteCopy.name}</span>
        </Link>
        <Outlet />
      </div>
    </div>
  )
}
