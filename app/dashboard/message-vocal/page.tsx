import { getVoiceCatalog } from '@/lib/message-vocal/voices'
import { MessageVocalClient } from '@/components/message-vocal/message-vocal-client'

// Le catalogue de voix est recupere cote serveur (RSC) : la cle ElevenLabs
// n'est jamais exposee au navigateur, seules les metadonnees + l'URL d'apercu
// publique sont transmises au client.
export const dynamic = 'force-dynamic'

export default async function MessageVocalPage() {
  const catalog = await getVoiceCatalog()
  return <MessageVocalClient catalog={catalog} />
}
