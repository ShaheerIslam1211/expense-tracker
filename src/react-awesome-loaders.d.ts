declare module 'react-awesome-loaders' {
  import type { FC } from 'react'

  export interface XlviLoaderProps {
    className?: string
    background?: string
    boxColors?: string[]
    size?: string
    desktopSize?: string
    mobileSize?: string
  }

  export const XlviLoader: FC<XlviLoaderProps>
}
