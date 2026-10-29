import { ReferenceHomepage } from "@/components/reference-homepage"
import { ChapCam2Announcement } from "@/components/dashboard/chapcam-2-announcement"

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <ReferenceHomepage />
      <ChapCam2Announcement delayMs={3000} oncePerSession={false} />
    </main>
  )
}
