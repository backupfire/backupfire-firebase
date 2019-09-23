declare module 'firebase-tools' {
  export const auth: {
    export: (path: string, options: { project: string }) => Promise<any>
  }
}
