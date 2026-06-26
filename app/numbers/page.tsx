import { redirect } from 'next/navigation'

// ChapCam users go straight into the functional app (buy numbers, manage them,
// receive their codes) instead of a marketing landing page.
export default function NumbersIndex() {
  redirect('/numbers/app')
}
