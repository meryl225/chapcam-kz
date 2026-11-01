import type { Metadata } from "next"
import { LegalShell, LegalSection } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "Privacy Policy — ChapCam",
  description:
    "ChapCam Privacy Policy: what data we collect, how we use it, how face data is handled, and your rights (GDPR).",
}

const linkClass = "text-primary hover:underline"

function ContactEmail() {
  return (
    <a href="mailto:contact@chapcam.com" className={linkClass}>
      contact@chapcam.com
    </a>
  )
}

export default function ConfidentialitePage() {
  return (
    <LegalShell
      locale="en"
      title="Privacy Policy"
      updatedAt="November 1, 2026"
      intro="This Privacy Policy explains how ChapCam collects, uses, retains and protects your personal data when you use our real-time face transformation platform. It applies in accordance with the General Data Protection Regulation (GDPR) and other applicable data protection laws."
    >
      <LegalSection title="1. Data controller">
        <p>
          ChapCam is the controller of your personal data processed in connection with your use of the Platform. For
          any question about your data, you can contact us at <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="2. Data we collect">
        <p>Depending on how you use the Platform, we may collect the following categories of data:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <span className="text-foreground">Account data</span>: email address, password (encrypted), and profile
            information you provide.
          </li>
          <li>
            <span className="text-foreground">Face data</span>: camera feed, photos and videos showing a face, which you
            provide in order to use certain features (see section 4).
          </li>
          <li>
            <span className="text-foreground">Content</span>: camera feed, images, avatars and other material you
            provide or generate.
          </li>
          <li>
            <span className="text-foreground">Payment data</span>: processed by our secure payment providers; we do not
            store your full card numbers.
          </li>
          <li>
            <span className="text-foreground">Usage and technical data</span>: IP address, device and browser type,
            connection logs, country, and audience analytics data.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Purposes and legal bases (GDPR)">
        <p>We process your data for the following purposes:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            providing and operating the Platform, creating and managing your account —{" "}
            <span className="text-foreground">basis: performance of a contract</span>;
          </li>
          <li>
            providing the features that use your photos, videos or camera feed (section 4) —{" "}
            <span className="text-foreground">basis: your consent, given when you launch the feature</span>;
          </li>
          <li>
            processing payments and managing subscriptions —{" "}
            <span className="text-foreground">basis: performance of a contract / legal obligation</span>;
          </li>
          <li>
            ensuring security and preventing fraud and abuse —{" "}
            <span className="text-foreground">basis: legitimate interest / legal obligation</span>;
          </li>
          <li>
            improving the Platform and producing statistics —{" "}
            <span className="text-foreground">basis: legitimate interest or consent</span>;
          </li>
          <li>
            sending you service-related communications and, where applicable, marketing —{" "}
            <span className="text-foreground">basis: consent / legitimate interest</span>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Face data and artificial intelligence processing">
        <div id="donnees-faciales" className="scroll-mt-24 space-y-3">
          <h3 className="font-semibold text-foreground">4.1 Face data processed</h3>
          <p>
            Some ChapCam features process images in which your face, or another person&apos;s face, may appear. This is
            only content you choose to provide:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="text-foreground">Live camera feed</span>: the image from your device&apos;s front camera
              during a Live Swap session;
            </li>
            <li>
              <span className="text-foreground">Photos</span>: the Live Swap reference face, your profile picture, and
              photos you select for Photo → Video, Motion, Genjutsu and ChapVerify;
            </li>
            <li>
              <span className="text-foreground">Videos</span>: videos you select for Genjutsu, Video Translation and
              ChapVerify;
            </li>
            <li>
              <span className="text-foreground">Generated content</span>: videos produced from these inputs.
            </li>
          </ul>
          <p>
            ChapCam does not compute, create or store any biometric template, faceprint or facial geometry measurement
            that could identify you. The app does not use Face ID, ARKit or the TrueDepth camera for these features.
            The face processing required to generate content is performed by the artificial intelligence models of our
            providers (see section 6), using the images and videos you send them through us.
          </p>
        </div>

        <div id="finalites-donnees-faciales" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.2 Purposes</h3>
          <p>This data is used exclusively to deliver the feature you launched:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Live Swap: replacing your face in real time with the reference face you chose;</li>
            <li>Photo → Video: animating the selected photo;</li>
            <li>Motion and Genjutsu: applying a reference motion or video to the selected photo;</li>
            <li>Video Translation: translating a video and synchronizing lip movements;</li>
            <li>ChapVerify: estimating whether an image or video was generated or altered by AI;</li>
            <li>Profile picture: displaying your profile in the app.</li>
          </ul>
          <p>
            Face data is processed only when you launch one of these features yourself and select or film content.
            ChapCam does not use your face data to identify you, for advertising, for profiling, or to train its own
            models, and does not sell it.
          </p>
        </div>

        <div id="temps-reel-et-fichiers" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.3 Real-time processing and saved files</h3>
          <p>
            <span className="text-foreground">Real time (Live Swap)</span>: your camera feed is sent, encrypted,
            directly from your device to the video transformation provider (Decart AI) for the duration of the session.
            It does not pass through ChapCam&apos;s servers and is neither recorded nor retained by ChapCam. The
            reference face you choose is sent to the provider at the start of the session. Only technical information
            without images (date and duration of the session) is retained.
          </p>
          <p>
            <span className="text-foreground">Saved files</span>: the photos and videos you select are sent, encrypted,
            to the relevant provider. Some of them are also retained by ChapCam, as described below, along with the
            generated videos.
          </p>
        </div>

        <div id="stockage-conservation-donnees-faciales" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.4 Storage locations and retention periods</h3>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="text-foreground">Live Swap camera feed</span>: not retained by ChapCam.
            </li>
            <li>
              <span className="text-foreground">Profile picture and Live Swap reference faces</span>: stored with
              Supabase (file storage) until you replace or delete them, or until you delete your account.
            </li>
            <li>
              <span className="text-foreground">Motion and Genjutsu source photos and videos</span>: stored with
              Supabase until you delete your account or request their deletion.
            </li>
            <li>
              <span className="text-foreground">Photo → Video, Video Translation and ChapVerify source photos and
              videos</span>: sent to the relevant provider; ChapCam does not keep a copy.
            </li>
            <li>
              <span className="text-foreground">Generated videos</span>: stored with Vercel (Blob) and Cloudflare (R2
              and Stream) until you delete them or delete your account.
            </li>
            <li>
              <span className="text-foreground">Technical information without images</span> (history, generation
              status, session logs): stored with Neon (database) and deleted with your account.
            </li>
          </ul>
          <p>
            <span className="text-foreground">With our providers</span>: how long each provider retains the files it
            receives is governed by its own terms and data processing agreements. ChapCam does not directly control
            this period and cannot guarantee the immediate deletion of these files by the provider. We will update this
            section as these periods are confirmed to us in writing.
          </p>
        </div>

        <div id="suppression-donnees-faciales" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.5 Deletion</h3>
          <ul className="ml-5 list-disc space-y-2">
            <li>you can delete your generated videos (Creations) and remove your profile picture in the app;</li>
            <li>
              you can delete your account in the app (Profile). This erases the files and data retained by ChapCam
              described in 4.4;
            </li>
            <li>
              you can request the deletion of your face data at any time at <ContactEmail />. Where possible, we will
              forward your request to the relevant providers.
            </li>
          </ul>
        </div>

        <div id="protection-droits-donnees-faciales" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.6 Safeguards and your rights</h3>
          <p>
            Data is encrypted in transit (HTTPS/TLS, encrypted WebRTC). Our providers&apos; access keys stay on our
            servers and are never embedded in the app; Live Swap uses a temporary token. Access to the camera and photos
            is requested only when you use a feature that needs it, and refusing does not prevent you from using the
            rest of the app. You must only provide images of yourself or of people who have consented. You can withdraw
            your consent at any time by no longer using these features, by disabling camera access in your device
            Settings, or by contacting us, and you can exercise the rights described in section 9.
          </p>
        </div>
      </LegalSection>

      <LegalSection title="5. Retention period">
        <p>
          We retain your data for as long as your account is active and as necessary for the purposes described, then
          delete or anonymize it. We may retain certain data longer when required by law (legal, accounting or tax
          obligations) or to establish, exercise or defend legal claims. Retention periods specific to face data are
          detailed in section 4.4. You can request the deletion of your data at <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="6. Sharing your data">
        <p>We do not sell your personal data. We may share it with:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            our technical providers (hosting, computing infrastructure, payment providers, analytics tools) acting on
            our behalf and bound by confidentiality obligations;
          </li>
          <li>competent authorities, courts or bodies, when required by law or to defend our rights;</li>
          <li>
            a third party in the event of a merger, acquisition or sale of all or part of our business, in accordance
            with this Policy.
          </li>
        </ul>
        <div id="sous-traitants" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">Providers and processors</h3>
          <p>
            Artificial intelligence providers receiving face data (photos, videos or camera feed) to generate the
            content you request:
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Decart AI: Live Swap (live camera feed and reference face);</li>
            <li>HeyGen: Photo → Video and Video Translation (selected photos and videos);</li>
            <li>Higgsfield: Motion and Genjutsu (selected photos and videos);</li>
            <li>Kling AI: Motion Control (selected photo and motion video);</li>
            <li>Resemble AI: ChapVerify (images and videos submitted for analysis).</li>
          </ul>
          <p>Providers that do not receive face data:</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>ElevenLabs and Resemble AI: voice messages, voice generation and voice transformation (audio only);</li>
            <li>
              Supabase (file storage), Vercel (hosting and Blob), Cloudflare (R2 and Stream) and Neon (database):
              hosting and storage of the data described in 4.4, on behalf of ChapCam.
            </li>
          </ul>
          <p>
            These providers may process data outside the European Economic Area, in particular in the United States
            (see section 7). This data is neither sold nor used for advertising by ChapCam.
          </p>
        </div>
      </LegalSection>

      <LegalSection title="7. Transfers outside the European Union">
        <p>
          When your data is transferred outside the European Economic Area, we put appropriate safeguards in place
          (European Commission adequacy decisions, standard contractual clauses or any other approved mechanism) to
          ensure a level of protection equivalent to that guaranteed by the GDPR.
        </p>
      </LegalSection>

      <LegalSection title="8. Security">
        <p>
          We implement appropriate technical and organizational measures to protect your data against unauthorized
          access, disclosure, alteration or destruction. As no system is completely infallible, we cannot guarantee
          absolute security. Please protect your credentials and the device you use.
        </p>
      </LegalSection>

      <LegalSection title="9. Your rights">
        <p>Under the GDPR, you have the following rights over your personal data:</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>right of access to your data;</li>
          <li>right to rectification of inaccurate data;</li>
          <li>right to erasure (&quot;right to be forgotten&quot;);</li>
          <li>right to restriction of processing and right to object;</li>
          <li>right to data portability;</li>
          <li>right to withdraw your consent at any time, in particular for the processing of your face data;</li>
          <li>
            right to lodge a complaint with a supervisory authority (in France, the CNIL —{" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className={linkClass}>
              cnil.fr
            </a>
            ).
          </li>
        </ul>
        <p>
          To exercise your rights, write to us at <ContactEmail />. We may ask you to verify your identity before
          processing your request.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies and analytics tools">
        <p>
          We use cookies and audience measurement tools to operate the Platform, analyze its use and improve our
          services. You can manage your cookie preferences in your browser settings. Some essential cookies are required
          for the service to work.
        </p>
      </LegalSection>

      <LegalSection title="11. Minors">
        <p>
          The Platform is not intended for people under eighteen (18) years of age, and we do not knowingly collect data
          from minors. If we learn that a minor has provided us with data, we will delete it. If you believe a minor has
          provided us with data, contact us at <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to this policy">
        <p>
          We may update this Privacy Policy. In the event of a significant change, we will inform you through a
          notification on the Platform or by any other appropriate means. We encourage you to review this page
          regularly.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact us">
        <p>
          For any question about this Policy or your personal data, contact us at <ContactEmail />.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
