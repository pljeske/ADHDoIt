import { rootRoute } from './routes/__root'
import { indexRoute } from './routes/index'
import { loginRoute } from './routes/login'
import { registerRoute } from './routes/register'
import { appLayoutRoute } from './routes/app/__layout'
import { todayRoute } from './routes/app/today'
import { upcomingRoute } from './routes/app/upcoming'
import { overdueRoute } from './routes/app/overdue'
import { doneRoute } from './routes/app/done'
import { categoryRoute } from './routes/app/category.$id'
import { focusRoute } from './routes/app/focus'
import { adminRoute } from './routes/app/admin'

export const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  appLayoutRoute.addChildren([
    todayRoute,
    upcomingRoute,
    overdueRoute,
    doneRoute,
    categoryRoute,
    focusRoute,
    adminRoute,
  ]),
])
