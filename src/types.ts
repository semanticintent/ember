export type ConstructType =
  | 'signal'
  | 'workflow'
  | 'screen'
  | 'spec'
  | 'episode'
  | 'architecture'
  | 'blueprint'
  | 'build'
  | 'certification'

export interface EmberConstruct {
  construct: ConstructType
  id: string
  version: number
  fields: Record<string, string | string[]>
  raw: string
}
