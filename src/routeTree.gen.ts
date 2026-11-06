/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root'
import { Route as IndexRouteImport } from './routes/index'
import { Route as MenuRouteImport } from './routes/menu'
import { Route as PrenotaRouteImport } from './routes/prenota'
import { Route as AdminRouteImport } from './routes/admin'

const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any)
const MenuRoute = MenuRouteImport.update({ id: '/menu', path: '/menu', getParentRoute: () => rootRouteImport } as any)
const PrenotaRoute = PrenotaRouteImport.update({ id: '/prenota', path: '/prenota', getParentRoute: () => rootRouteImport } as any)
const AdminRoute = AdminRouteImport.update({ id: '/admin', path: '/admin', getParentRoute: () => rootRouteImport } as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/menu': typeof MenuRoute
  '/prenota': typeof PrenotaRoute
  '/admin': typeof AdminRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/menu': typeof MenuRoute
  '/prenota': typeof PrenotaRoute
  '/admin': typeof AdminRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/menu': typeof MenuRoute
  '/prenota': typeof PrenotaRoute
  '/admin': typeof AdminRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/menu' | '/prenota' | '/admin'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/menu' | '/prenota' | '/admin'
  id: '__root__' | '/' | '/menu' | '/prenota' | '/admin'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  MenuRoute: typeof MenuRoute
  PrenotaRoute: typeof PrenotaRoute
  AdminRoute: typeof AdminRoute
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  MenuRoute: MenuRoute,
  PrenotaRoute: PrenotaRoute,
  AdminRoute: AdminRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()
