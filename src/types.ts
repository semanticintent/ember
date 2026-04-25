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
  | 'schema'
  | 'routine'
  | 'job'
  | 'dependency'
  | 'decision'

export interface EmberConstruct {
  construct: ConstructType
  id: string
  version: number
  fields: Record<string, string | string[]>
  raw: string
}
