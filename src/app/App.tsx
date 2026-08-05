import { House, Layers3 } from 'lucide-react';
import { createBrowserRouter, Link, Outlet } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { Button } from '@/components/ui/button';

const linkButtonClass =
  'inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90';

function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link className="font-semibold" to="/">
            AL07 Team 01
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link className="hover:text-foreground" to="/">
              홈
            </Link>
            <Link className="hover:text-foreground" to="/about">
              소개
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-16">
        <Outlet />
      </main>
    </div>
  );
}

function HomePage() {
  return (
    <section className="overflow-hidden rounded-lg border-4 border-neutral-500 bg-white shadow-sm">
      <div className="h-9 border-b-4 border-teal-600 bg-teal-400" />
      <div className="flex min-h-76 items-start gap-4 px-22 pt-15">
        <Button className="h-18 rounded-lg border-4 border-violet-500 bg-violet-200 px-7 text-base font-medium text-slate-800 hover:bg-violet-200">
          버튼1
        </Button>
        <Button className="h-18 rounded-lg border-4 border-amber-500 bg-amber-200 px-7 text-base font-medium text-slate-800 hover:bg-amber-200">
          버튼2
        </Button>
      </div>
    </section>
  );
}

function AboutPage() {
  const items = [
    { icon: House, label: 'React Router 기반 SPA 라우팅' },
    { icon: Layers3, label: 'Tailwind CSS와 shadcn/ui 호환 구조' },
  ];

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">기본 구성</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map(({ icon: Icon, label }) => (
          <div className="rounded-xl border border-border bg-card p-6" key={label}>
            <Icon className="mb-4 size-6 text-primary" />
            <p>{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function NotFoundPage() {
  return (
    <section className="space-y-4 text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="text-3xl font-bold">페이지를 찾을 수 없습니다</h1>
      <Link className={`${linkButtonClass} mt-4`} to="/">
        홈으로 이동
      </Link>
    </section>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: HomePage },
      { path: 'about', Component: AboutPage },
      { path: '*', Component: NotFoundPage },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
