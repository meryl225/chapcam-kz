import type { Metadata } from 'next'
import { LegalPage } from '@/components/numbers/legal-page'

export const metadata: Metadata = { title: 'Acceptable Use Policy — ChapCam Numbers' }

export default function AcceptableUsePage() {
  return (
    <LegalPage
      title="Acceptable Use Policy"
      updated="June 2026"
      intro="This Acceptable Use Policy defines the activities that are prohibited on the ChapCam Numbers platform. It exists to keep the service safe, lawful, and reliable for everyone."
      sections={[
        { heading: 'Lawful Use Only', body: ['You may only use virtual numbers for lawful purposes and in compliance with all applicable laws and regulations, including telecommunications, anti-spam, and data protection laws in the relevant jurisdictions.'] },
        { heading: 'Prohibited Activities', body: ['You must not use the service to commit fraud, impersonate a person or business, evade lawful identity or age verification, harass or threaten others, or distribute malware or phishing content.', 'You must not use numbers to create fake accounts on third-party services in violation of their terms.'] },
        { heading: 'Messaging Standards', body: ['You must not send unsolicited bulk messages (spam), deceptive content, or messages that violate consent requirements. Marketing messages must honor opt-out requests.'] },
        { heading: 'Fraud and Abuse Prevention', body: ['We operate automated and manual systems to detect abuse, including velocity checks, geo-anomaly detection, and risk scoring. Accounts presenting high risk may be rate-limited, suspended, or terminated.'] },
        { heading: 'Cooperation with Authorities', body: ['We cooperate with lawful requests from law enforcement and telecommunication providers, and may disclose information as required by law to investigate suspected violations.'] },
        { heading: 'Reporting Abuse', body: ['If you believe a number or account is being used in violation of this policy, report it to abuse@chapcam.com. We investigate all reports promptly.'] },
        { heading: 'Enforcement', body: ['Violations may result in immediate suspension or termination without refund, and may be reported to relevant authorities where appropriate.'] },
      ]}
    />
  )
}
