/// <reference types="vite/client" />

// Allow CSS module side-effect imports
declare module '*.css' {
  const _: Record<string, string>
  export default _
}
