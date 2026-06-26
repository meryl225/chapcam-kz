import type { Metadata } from 'next'
import { LegalPage } from '@/components/numbers/legal-page'

export const metadata: Metadata = { title: 'Privacy Policy — ChapCam Numbers' }

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="June 2026"
      intro="This Privacy Policy explains how ChapCam Numbers collects, uses, and protects your information when you use our platform."
      sections={[
        { heading: 'Information We Collect', body: ['We collect account information (name, email), billing and transaction data, usage data, and the content of messages received on numbers you provision for the purpose of delivering them to you.'] },
        { heading: 'How We Use Information', body: ['We use your information to provide and improve the service, process payments, prevent fraud and abuse, comply with legal obligations, and communicate with you about your account.'] },
        { heading: 'Message Content', body: ['Inbound messages received on your numbers are stored only as long as necessary to deliver them and provide your message history. You can delete or archive messages at any time.'] },
        { heading: 'Data Sharing', body: ['We share data with telecommunication providers strictly as needed to provision numbers and deliver messages, and with payment processors to handle transactions. We do not sell your personal data.'] },
        { heading: 'Data Retention', body: ['We retain personal data for as long as your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce agreements.'] },
        { heading: 'Security', body: ['We implement industry-standard safeguards including encryption in transit, access controls, and audit logging. API secrets are stored only as hashes.'] },
        { heading: 'Your Rights', body: ['Depending on your jurisdiction, you may have rights to access, correct, export, or delete your personal data. Contact us to exercise these rights.'] },
        { heading: 'Contact', body: ['For privacy inquiries, contact our data protection team at privacy@chapcam.com.'] },
      ]}
    />
  )
}
