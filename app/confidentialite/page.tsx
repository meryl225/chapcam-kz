import type { Metadata } from "next"
import { LegalShell, LegalSection } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "Politique de Confidentialité — ChapCam",
  description:
    "Politique de Confidentialité de ChapCam : quelles données nous collectons, comment nous les utilisons et vos droits (RGPD).",
}

export default function ConfidentialitePage() {
  return (
    <LegalShell
      title="Politique de Confidentialité"
      updatedAt="15 octobre 2026"
      intro="La présente Politique de Confidentialité explique comment ChapCam collecte, utilise, conserve et protège vos données personnelles lorsque vous utilisez notre plateforme de transformation de visage en temps réel. Elle s'applique conformément au Règlement Général sur la Protection des Données (RGPD) et aux lois applicables en matière de protection des données."
    >
      <LegalSection title="1. Responsable du traitement">
        <p>
          ChapCam est responsable du traitement de vos données personnelles dans le cadre de l&apos;utilisation de la
          Plateforme. Pour toute question relative à vos données, vous pouvez nous contacter à{" "}
          <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
            contact@chapcam.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Données que nous collectons">
        <p>Selon votre utilisation de la Plateforme, nous pouvons collecter les catégories de données suivantes :</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            <span className="text-foreground">Données de compte</span> : adresse e-mail, mot de passe (chiffré), et
            informations de profil que vous fournissez.
          </li>
          <li>
            <span className="text-foreground">Données faciales</span> : flux caméra, photos et vidéos montrant un
            visage, que vous fournissez pour utiliser certaines fonctionnalités (voir la section 4).
          </li>
          <li>
            <span className="text-foreground">Contenu</span> : flux caméra, images, avatars et autres éléments que vous
            fournissez ou générez.
          </li>
          <li>
            <span className="text-foreground">Données de paiement</span> : traitées par nos prestataires de paiement
            sécurisés ; nous ne stockons pas vos numéros de carte complets.
          </li>
          <li>
            <span className="text-foreground">Données d&apos;usage et techniques</span> : adresse IP, type
            d&apos;appareil et de navigateur, journaux de connexion, pays, et données d&apos;analyse d&apos;audience.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalités et bases légales (RGPD)">
        <p>Nous traitons vos données pour les finalités suivantes :</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            fournir et exploiter la Plateforme, créer et gérer votre compte —{" "}
            <span className="text-foreground">base : exécution du contrat</span> ;
          </li>
          <li>
            fournir les fonctionnalités utilisant vos photos, vidéos ou flux caméra (section 4) —{" "}
            <span className="text-foreground">base : votre consentement, exprimé lorsque vous lancez la fonctionnalité</span> ;
          </li>
          <li>
            traiter les paiements et gérer les abonnements —{" "}
            <span className="text-foreground">base : exécution du contrat / obligation légale</span> ;
          </li>
          <li>
            assurer la sécurité, prévenir la fraude et les usages abusifs —{" "}
            <span className="text-foreground">base : intérêt légitime / obligation légale</span> ;
          </li>
          <li>
            améliorer la Plateforme et réaliser des statistiques —{" "}
            <span className="text-foreground">base : intérêt légitime ou consentement</span> ;
          </li>
          <li>
            vous adresser des communications relatives au service ou, le cas échéant, marketing —{" "}
            <span className="text-foreground">base : consentement / intérêt légitime</span>.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Données faciales et traitement par intelligence artificielle">
        <div id="donnees-faciales" className="scroll-mt-24 space-y-3">
          <h3 className="font-semibold text-foreground">4.1 Données faciales traitées</h3>
          <p>
            Certaines fonctionnalités de ChapCam traitent des images sur lesquelles votre visage, ou celui d&apos;une
            autre personne, peut apparaître. Il s&apos;agit uniquement des contenus que vous choisissez de fournir :
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="text-foreground">Flux caméra en direct</span> : image de la caméra avant de votre
              appareil pendant une session Live Swap ;
            </li>
            <li>
              <span className="text-foreground">Photos</span> : visage de référence Live Swap, photo de profil, et
              photos que vous sélectionnez pour Photo → Vidéo, Motion, Genjutsu et ChapVerify ;
            </li>
            <li>
              <span className="text-foreground">Vidéos</span> : vidéos que vous sélectionnez pour Genjutsu, la
              Traduction vidéo et ChapVerify ;
            </li>
            <li>
              <span className="text-foreground">Contenus générés</span> : vidéos produites à partir de ces éléments.
            </li>
          </ul>
          <p>
            ChapCam ne calcule pas, ne crée pas et ne conserve pas de gabarit biométrique, d&apos;empreinte faciale ou
            de mesure de la géométrie du visage permettant de vous identifier. L&apos;application n&apos;utilise ni Face
            ID, ni ARKit, ni la caméra TrueDepth pour ces fonctionnalités. Le traitement du visage nécessaire à la
            génération des contenus est effectué par les modèles d&apos;intelligence artificielle de nos prestataires
            (voir la section 6), à partir des images et vidéos que vous leur transmettez par notre intermédiaire.
          </p>
        </div>

        <div id="finalites-donnees-faciales" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.2 Finalités</h3>
          <p>Ces données sont utilisées exclusivement pour fournir la fonctionnalité que vous avez lancée :</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Live Swap : remplacer en direct votre visage par le visage de référence choisi ;</li>
            <li>Photo → Vidéo : animer la photo sélectionnée ;</li>
            <li>Motion et Genjutsu : appliquer un mouvement ou une vidéo de référence à la photo sélectionnée ;</li>
            <li>Traduction vidéo : traduire une vidéo et synchroniser les lèvres ;</li>
            <li>ChapVerify : estimer si une image ou une vidéo a été générée ou modifiée par une IA ;</li>
            <li>Photo de profil : afficher votre profil dans l&apos;application.</li>
          </ul>
          <p>
            Les données faciales ne sont traitées que lorsque vous lancez vous-même une de ces fonctionnalités et
            sélectionnez ou filmez un contenu. ChapCam n&apos;utilise pas vos données faciales pour vous identifier, pour
            la publicité, pour le profilage, ni pour entraîner ses propres modèles, et ne les vend pas.
          </p>
        </div>

        <div id="temps-reel-et-fichiers" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.3 Traitement en temps réel et fichiers enregistrés</h3>
          <p>
            <span className="text-foreground">Temps réel (Live Swap)</span> : le flux de votre caméra est transmis de
            votre appareil directement au prestataire de transformation vidéo, de façon chiffrée, pendant la durée de la
            session. Il ne transite pas par les serveurs de ChapCam et n&apos;est ni enregistré ni conservé par ChapCam.
            Seules des informations techniques sans image (date, durée de la session) sont conservées.
          </p>
          <p>
            <span className="text-foreground">Fichiers enregistrés</span> : les photos et vidéos que vous sélectionnez
            sont envoyées de façon chiffrée au prestataire concerné. Certaines sont également conservées par ChapCam,
            comme indiqué ci-dessous, ainsi que les vidéos générées.
          </p>
        </div>

        <div id="stockage-conservation-donnees-faciales" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.4 Lieux de stockage et durées de conservation</h3>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="text-foreground">Flux caméra Live Swap</span> : non conservé par ChapCam.
            </li>
            <li>
              <span className="text-foreground">Photo de profil et visages de référence Live Swap</span> : stockés chez
              Supabase (stockage de fichiers), jusqu&apos;à leur remplacement ou suppression par vous, ou jusqu&apos;à la
              suppression de votre compte.
            </li>
            <li>
              <span className="text-foreground">Photos et vidéos source Motion et Genjutsu</span> : stockées chez
              Supabase, jusqu&apos;à la suppression de votre compte ou jusqu&apos;à votre demande de suppression.
            </li>
            <li>
              <span className="text-foreground">Photos et vidéos source Photo → Vidéo, Traduction vidéo et
              ChapVerify</span> : transmises au prestataire concerné ; ChapCam n&apos;en conserve pas de copie.
            </li>
            <li>
              <span className="text-foreground">Vidéos générées</span> : stockées chez Vercel (Blob) et Cloudflare (R2
              et Stream), jusqu&apos;à leur suppression par vous ou jusqu&apos;à la suppression de votre compte.
            </li>
            <li>
              <span className="text-foreground">Informations techniques sans image</span> (historique, statut des
              générations, journaux de session) : stockées chez Neon (base de données) et supprimées avec votre compte.
            </li>
          </ul>
          <p>
            <span className="text-foreground">Chez nos prestataires</span> : la durée pendant laquelle chaque
            prestataire conserve les fichiers qu&apos;il reçoit est régie par ses propres conditions et accords de
            traitement des données. ChapCam ne contrôle pas directement cette durée et ne peut pas garantir la
            suppression immédiate de ces fichiers chez le prestataire. Nous mettrons à jour cette section à mesure que
            ces durées nous sont confirmées par écrit.
          </p>
        </div>

        <div id="suppression-donnees-faciales" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.5 Suppression</h3>
          <ul className="ml-5 list-disc space-y-2">
            <li>
              vous pouvez supprimer vos vidéos générées (Créations) et retirer votre photo de profil depuis
              l&apos;application ;
            </li>
            <li>
              vous pouvez supprimer votre compte depuis l&apos;application (Profil). Cette suppression efface les
              fichiers et données conservés par ChapCam décrits en 4.4 ;
            </li>
            <li>
              vous pouvez demander à tout moment la suppression de vos données faciales à{" "}
              <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
                contact@chapcam.com
              </a>
              . Nous transmettrons, lorsque c&apos;est possible, votre demande aux prestataires concernés.
            </li>
          </ul>
        </div>

        <div id="protection-droits-donnees-faciales" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">4.6 Mesures de protection et vos droits</h3>
          <p>
            Les échanges sont chiffrés en transit (HTTPS/TLS, WebRTC chiffré). Les clés d&apos;accès à nos prestataires
            restent sur nos serveurs et ne sont jamais intégrées à l&apos;application ; Live Swap utilise un jeton
            temporaire. L&apos;accès à la caméra et aux photos n&apos;est demandé qu&apos;au moment où vous utilisez une
            fonctionnalité qui en a besoin, et votre refus n&apos;empêche pas d&apos;utiliser le reste de
            l&apos;application. Vous ne devez fournir que des images de vous-même ou de personnes qui y ont consenti.
            Vous pouvez retirer votre consentement à tout moment en cessant d&apos;utiliser ces fonctionnalités, en
            désactivant l&apos;accès à la caméra dans les Réglages de votre appareil ou en nous contactant, et exercer
            les droits décrits à la section 9.
          </p>
        </div>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <p>
          Nous conservons vos données aussi longtemps que votre compte est actif et que cela est nécessaire aux
          finalités décrites, puis nous les supprimons ou les anonymisons. Nous pouvons conserver certaines données plus
          longtemps lorsque la loi l&apos;exige (obligations légales, comptables ou fiscales) ou pour la constatation,
          l&apos;exercice ou la défense de droits en justice. Les durées propres aux données faciales sont détaillées
          à la section 4.4. Vous pouvez demander la suppression de vos données à{" "}
          <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
            contact@chapcam.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="6. Partage de vos données">
        <p>Nous ne vendons pas vos données personnelles. Nous pouvons les partager avec :</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            nos prestataires techniques (hébergement, infrastructure de calcul, fournisseurs de paiement, outils
            d&apos;analyse) agissant en notre nom et soumis à des obligations de confidentialité ;
          </li>
          <li>
            les autorités, juridictions ou organismes compétents, lorsque la loi l&apos;exige ou pour défendre nos
            droits ;
          </li>
          <li>
            un tiers en cas de fusion, acquisition ou cession de tout ou partie de notre activité, dans le respect de la
            présente Politique.
          </li>
        </ul>
        <div id="sous-traitants" className="scroll-mt-24 space-y-3 pt-2">
          <h3 className="font-semibold text-foreground">Prestataires et sous-traitants</h3>
          <p>
            Prestataires d&apos;intelligence artificielle recevant des données faciales (photos, vidéos ou flux caméra)
            pour générer les contenus que vous demandez :
          </p>
          <ul className="ml-5 list-disc space-y-2">
            <li>Decart : Live Swap (flux caméra en direct et visage de référence) ;</li>
            <li>HeyGen : Photo → Vidéo et Traduction vidéo (photos et vidéos sélectionnées) ;</li>
            <li>Higgsfield : Motion et Genjutsu (photos et vidéos sélectionnées) ;</li>
            <li>Resemble AI : ChapVerify (images et vidéos soumises à l&apos;analyse).</li>
          </ul>
          <p>Prestataires ne recevant pas de données faciales :</p>
          <ul className="ml-5 list-disc space-y-2">
            <li>ElevenLabs et Resemble AI : message vocal, génération et transformation de voix (audio uniquement) ;</li>
            <li>
              Supabase (stockage de fichiers), Vercel (hébergement et Blob), Cloudflare (R2 et Stream) et Neon (base de
              données) : hébergement et stockage des données décrits en 4.4, pour le compte de ChapCam.
            </li>
          </ul>
          <p>
            Ces prestataires peuvent traiter les données en dehors de l&apos;Espace économique européen, notamment aux
            États-Unis (voir la section 7). Ces données ne sont ni vendues ni utilisées à des fins publicitaires par
            ChapCam.
          </p>
        </div>
      </LegalSection>

      <LegalSection title="7. Transferts hors de l'Union européenne">
        <p>
          Lorsque vos données sont transférées en dehors de l&apos;Espace économique européen, nous mettons en place des
          garanties appropriées (décisions d&apos;adéquation de la Commission européenne, clauses contractuelles types
          ou tout autre mécanisme approuvé) afin d&apos;assurer un niveau de protection équivalent à celui garanti par
          le RGPD.
        </p>
      </LegalSection>

      <LegalSection title="8. Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données
          contre l&apos;accès, la divulgation, l&apos;altération ou la destruction non autorisés. Aucun système
          n&apos;étant totalement infaillible, nous ne pouvons toutefois garantir une sécurité absolue. Veillez à
          protéger vos identifiants et l&apos;appareil que vous utilisez.
        </p>
      </LegalSection>

      <LegalSection title="9. Vos droits">
        <p>Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</p>
        <ul className="ml-5 list-disc space-y-2">
          <li>droit d&apos;accès à vos données ;</li>
          <li>droit de rectification des données inexactes ;</li>
          <li>droit à l&apos;effacement (« droit à l&apos;oubli ») ;</li>
          <li>droit à la limitation et droit d&apos;opposition au traitement ;</li>
          <li>droit à la portabilité de vos données ;</li>
          <li>
            droit de retirer votre consentement à tout moment, notamment pour le traitement de vos données faciales ;
          </li>
          <li>
            droit d&apos;introduire une réclamation auprès d&apos;une autorité de contrôle (en France, la CNIL —{" "}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              cnil.fr
            </a>
            ).
          </li>
        </ul>
        <p>
          Pour exercer vos droits, écrivez-nous à{" "}
          <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
            contact@chapcam.com
          </a>
          . Nous pourrons vous demander de vérifier votre identité avant de traiter votre demande.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies et outils d'analyse">
        <p>
          Nous utilisons des cookies et des outils de mesure d&apos;audience pour assurer le fonctionnement de la
          Plateforme, analyser son utilisation et améliorer nos services. Vous pouvez gérer vos préférences de cookies
          via les paramètres de votre navigateur. Certains cookies essentiels sont nécessaires au fonctionnement du
          service.
        </p>
      </LegalSection>

      <LegalSection title="11. Mineurs">
        <p>
          La Plateforme n&apos;est pas destinée aux personnes de moins de dix-huit (18) ans et nous ne collectons pas
          sciemment de données auprès de mineurs. Si nous apprenons qu&apos;un mineur nous a transmis des données, nous
          les supprimerons. Si vous pensez qu&apos;un mineur nous a fourni des données, contactez-nous à{" "}
          <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
            contact@chapcam.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="12. Modifications de cette politique">
        <p>
          Nous pouvons mettre à jour la présente Politique de Confidentialité. En cas de modification significative, nous
          vous en informerons par une notification sur la Plateforme ou par tout autre moyen approprié. Nous vous
          invitons à consulter régulièrement cette page.
        </p>
      </LegalSection>

      <LegalSection title="13. Nous contacter">
        <p>
          Pour toute question relative à la présente Politique ou à vos données personnelles, contactez-nous à{" "}
          <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
            contact@chapcam.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  )
}
