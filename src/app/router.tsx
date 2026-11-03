import { createBrowserRouter } from 'react-router'
import { ErrorPage, NotFound } from '@/screens/Fallbacks'
import { TodayScreen } from '@/screens/today/TodayScreen'
import { Shell } from './Shell'

// Today ships in the first load; the other screens load when first opened.
export const router = createBrowserRouter([
  {
    element: <Shell />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <TodayScreen /> },
      { path: 'plan', lazy: () => import('@/screens/plan/PlanScreen').then((m) => ({ Component: m.PlanScreen })) },
      { path: 'progress', lazy: () => import('@/screens/progress/ProgressScreen').then((m) => ({ Component: m.ProgressScreen })) },
      { path: 'you', lazy: () => import('@/screens/you/YouScreen').then((m) => ({ Component: m.YouScreen })) },
      { path: 'workout/:id', lazy: () => import('@/screens/workout/WorkoutScreen').then((m) => ({ Component: m.WorkoutScreen })) },
      { path: '*', element: <NotFound /> },
    ],
  },
  { path: 'start', lazy: () => import('@/screens/onboarding/Onboarding').then((m) => ({ Component: m.Onboarding })), errorElement: <ErrorPage /> },
])
