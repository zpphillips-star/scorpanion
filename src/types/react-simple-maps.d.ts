declare module 'react-simple-maps' {
  import { ReactNode, CSSProperties, MouseEvent } from 'react'

  export interface ComposableMapProps {
    projection?: string
    projectionConfig?: Record<string, unknown>
    style?: CSSProperties
    width?: number
    height?: number
    children?: ReactNode
  }
  export function ComposableMap(props: ComposableMapProps): JSX.Element

  export interface GeographiesProps {
    geography: string | object
    children: (args: { geographies: GeoFeature[] }) => ReactNode
  }
  export function Geographies(props: GeographiesProps): JSX.Element

  export interface GeoFeature {
    rsmKey: string
    id: string
    type: string
    geometry: object
    properties: Record<string, unknown>
  }

  export interface GeographyStyle {
    fill?: string
    stroke?: string
    strokeWidth?: number
    outline?: string
    cursor?: string
    transition?: string
    filter?: string
  }

  export interface GeographyProps {
    geography: GeoFeature
    onClick?: (geo: GeoFeature, evt: MouseEvent) => void
    onMouseEnter?: (geo: GeoFeature, evt: MouseEvent) => void
    onMouseLeave?: (geo: GeoFeature, evt: MouseEvent) => void
    style?: {
      default?: GeographyStyle
      hover?: GeographyStyle
      pressed?: GeographyStyle
    }
    tabIndex?: number
    key?: string
  }
  export function Geography(props: GeographyProps): JSX.Element

  export interface AnnotationProps {
    subject: [number, number]
    dx?: number
    dy?: number
    children?: ReactNode
    connectorProps?: Record<string, unknown>
    style?: CSSProperties
  }
  export function Annotation(props: AnnotationProps): JSX.Element
}
