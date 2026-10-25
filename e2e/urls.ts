export const basePath = process.env.APP_BASE_PATH ?? '/japan-travel/';
export const appUrl = (route = '/') =>
  `http://127.0.0.1:4173${basePath}${basePath === '/' ? route.slice(1) : '#' + route}`;
