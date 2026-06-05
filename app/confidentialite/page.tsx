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
      updatedAt="5 juin 2026"
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
            <span className="text-foreground">Données faciales et biométriques</span> : géométrie du visage et données
            techniques nécessaires pour réaliser la transformation en temps réel.
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
            réaliser la transformation faciale en temps réel à partir de vos données biométriques —{" "}
            <span className="text-foreground">base : votre consentement explicite</span> ;
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

      <LegalSection title="4. Traitement des données faciales et biométriques">
        <p>
          La transformation de visage en temps réel nécessite l&apos;analyse de la géométrie de votre visage. Ce
          traitement n&apos;est mis en œuvre qu&apos;avec votre consentement explicite, donné au moment où vous activez
          la fonctionnalité. Le traitement vidéo est réalisé en temps réel : nous ne conservons pas votre flux caméra de
          manière permanente au-delà de ce qui est nécessaire au fonctionnement de la session, sauf si vous choisissez
          explicitement d&apos;enregistrer ou de sauvegarder un contenu. Vous pouvez retirer votre consentement à tout
          moment en cessant d&apos;utiliser la fonctionnalité ou en nous contactant ; ce retrait peut toutefois vous
          priver de l&apos;accès à certaines fonctionnalités.
        </p>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <p>
          Nous conservons vos données aussi longtemps que votre compte est actif et que cela est nécessaire aux
          finalités décrites, puis nous les supprimons ou les anonymisons. Nous pouvons conserver certaines données plus
          longtemps lorsque la loi l&apos;exige (obligations légales, comptables ou fiscales) ou pour la constatation,
          l&apos;exercice ou la défense de droits en justice. Les données biométriques sont conservées uniquement le
          temps strictement nécessaire à la fourniture du service. Vous pouvez demander la suppression de vos données à{" "}
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
            droit de retirer votre consentement à tout moment, notamment pour le traitement de vos données biométriques ;
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
