import type { Metadata } from 'next'
import { LegalPage } from '@/components/numbers/legal-page'

export const metadata: Metadata = { title: 'Terms of Service — ChapCam Numbers' }

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="June 2026"
      intro="These Terms of Service govern your access to and use of the ChapCam Numbers platform. By creating an account, you agree to be bound by these terms."
      sections={[
        { heading: 'Acceptance of Terms', body: ['By registering for or using ChapCam Numbers, you confirm that you have read, understood, and agree to these Terms of Service, our Privacy Policy, and our Acceptable Use Policy.', 'If you are using the service on behalf of an organization, you represent that you have authority to bind that organization to these terms.'] },
        { heading: 'Description of Service', body: ['ChapCam Numbers provides access to virtual phone numbers aggregated from multiple telecommunication providers for the purpose of legitimate business communications, customer verification, testing, and software integrations.'] },
        { heading: 'Account Registration', body: ['You must provide accurate and complete information when creating an account and keep it up to date. You are responsible for safeguarding your credentials and for all activity that occurs under your account.'] },
        { heading: 'Acceptable Use', body: ['You agree to use the service only for lawful purposes and in compliance with our Acceptable Use Policy. You may not use virtual numbers to commit fraud, impersonate others, evade lawful identity verification, or send unsolicited or abusive messages.'] },
        { heading: 'Payments and Wallet', body: ['Services are billed against your prepaid wallet balance or applicable subscription plan. Deposits are non-refundable except where required by law or expressly stated. Prices may change with reasonable notice.'] },
        { heading: 'Service Availability', body: ['We strive for high availability but do not guarantee uninterrupted service. Number availability depends on upstream providers and may vary by country and over time.'] },
        { heading: 'Suspension and Termination', body: ['We may suspend or terminate accounts that violate these terms, present security or fraud risk, or are required to be actioned by law or a provider. You may close your account at any time.'] },
        { heading: 'Limitation of Liability', body: ['To the maximum extent permitted by law, ChapCam Numbers is not liable for indirect, incidental, or consequential damages arising from your use of the service.'] },
        { heading: 'Changes to These Terms', body: ['We may update these terms from time to time. Material changes will be communicated, and continued use of the service constitutes acceptance of the revised terms.'] },
      ]}
    />
  )
}
