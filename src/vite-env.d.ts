declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'uuid' {
  export function v4(): string
}

declare module 'jspdf-autotable' {
  import jsPDF from 'jspdf'
  export default function autoTable(doc: jsPDF, options: any): void
}
