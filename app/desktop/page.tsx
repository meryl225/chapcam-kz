import type { Metadata } from 'next'
import { DesktopStudio } from '@/components/desktop/desktop-studio'

export const metadata: Metadata = {
  title: 'ChapCam PC — Studio Face Swap',
  description:
    'Interface du logiciel ChapCam PC : face swap en temps reel sur votre GPU local avec sortie vers une camera virtuelle.',
}

export default function DesktopPage() {
  return <DesktopStudio />
}
