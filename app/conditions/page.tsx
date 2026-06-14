import type { Metadata } from "next"
import { LegalShell, LegalSection } from "@/components/legal/legal-shell"

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — ChapCam",
  description:
    "Conditions Générales d'Utilisation de ChapCam, service de transformation de visage (face swap) en temps réel.",
}

export default function ConditionsPage() {
  return (
    <LegalShell
      title="Conditions Générales d'Utilisation"
      updatedAt="5 juin 2026"
      intro="Veuillez lire attentivement les présentes Conditions Générales d'Utilisation (les « Conditions ») avant d'utiliser ChapCam. En accédant à la plateforme ou en l'utilisant, vous reconnaissez avoir lu, compris et accepté d'être lié par ces Conditions ainsi que par notre Politique de Confidentialité. Si vous n'acceptez pas ces Conditions, n'utilisez pas la plateforme."
    >
      <LegalSection title="1. Présentation du service">
        <p>
          ChapCam (« ChapCam », « nous », « notre » ou « nos ») édite et exploite une plateforme accessible via le site
          web chapcam.com, ses sous-domaines et toute application associée (collectivement, la « Plateforme »). La
          Plateforme permet de transformer l&apos;apparence d&apos;un visage en temps réel (technologie dite de « face
          swap ») afin de l&apos;utiliser lors de diffusions en direct, d&apos;appels vidéo et sur d&apos;autres
          plateformes de communication.
        </p>
        <p>
          Vous fournissez des éléments d&apos;entrée (votre flux caméra, des images, des avatars ou d&apos;autres
          contenus, l&apos;« Entrée ») et la Plateforme génère un résultat transformé (la « Sortie »). L&apos;Entrée et
          la Sortie sont désignées ensemble par le terme « Contenu ».
        </p>
      </LegalSection>

      <LegalSection title="2. Acceptation et modification des Conditions">
        <p>
          En créant un compte, en cliquant sur une case d&apos;acceptation ou en utilisant la Plateforme, vous acceptez
          d&apos;être lié par les présentes Conditions. Nous nous réservons le droit de modifier ces Conditions à tout
          moment. Les modifications prennent effet dix (10) jours après leur publication sur la Plateforme. Votre
          utilisation continue de la Plateforme après cette publication vaut acceptation des modifications.
        </p>
      </LegalSection>

      <LegalSection title="3. Éligibilité et âge requis">
        <p>
          La Plateforme est réservée aux personnes âgées d&apos;au moins dix-huit (18) ans. En utilisant ChapCam, vous
          déclarez et garantissez avoir au moins 18 ans et disposer de la pleine capacité juridique pour conclure le
          présent contrat. Nous nous réservons le droit de suspendre l&apos;accès à toute personne en violation de cette
          disposition.
        </p>
      </LegalSection>

      <LegalSection title="4. Compte utilisateur">
        <p>
          L&apos;utilisation de certaines fonctionnalités nécessite la création d&apos;un compte. Vous vous engagez à
          fournir des informations exactes, complètes et à jour, et à ne pas créer de compte pour autrui ou utiliser le
          compte d&apos;un tiers sans autorisation. Vous êtes seul responsable de la confidentialité de vos identifiants
          et de toute activité réalisée depuis votre compte. Vous devez nous informer immédiatement de toute
          utilisation non autorisée. Pour supprimer votre compte, écrivez-nous à{" "}
          <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
            contact@chapcam.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="paiements" title="5. Abonnements, crédits et paiements">
        <p>
          Certaines fonctionnalités sont payantes, comme indiqué sur la Plateforme. Le paiement peut donner droit à un
          abonnement ou à un certain nombre de crédits utilisables sur la Plateforme. Sauf disposition légale impérative
          contraire ou mention expresse de notre part, les sommes versées et les crédits ne sont pas remboursables et
          peuvent expirer selon les conditions affichées au moment de l&apos;achat. Le défaut de paiement peut entraîner
          la suspension de tout ou partie de l&apos;accès à la Plateforme.
        </p>
      </LegalSection>

      <LegalSection title="6. Utilisations interdites">
        <p>
          ChapCam est destiné à un usage de divertissement, de création et de protection de la vie privée. Vous vous
          engagez à ne pas utiliser la Plateforme pour :
        </p>
        <ul className="ml-5 list-disc space-y-2">
          <li>
            usurper l&apos;identité d&apos;une personne réelle, vous faire passer frauduleusement pour autrui, ou tromper
            des tiers sur votre identité à des fins illégales ou malveillantes ;
          </li>
          <li>
            créer ou diffuser des contenus trompeurs (« deepfakes ») destinés à nuire, à diffamer, à harceler, à
            humilier ou à porter atteinte à la réputation d&apos;une personne ;
          </li>
          <li>
            commettre une fraude, une escroquerie, un chantage, une manipulation, ou contourner des systèmes de
            vérification d&apos;identité (KYC, reconnaissance faciale, etc.) ;
          </li>
          <li>
            produire, afficher ou transmettre des contenus illégaux, haineux, violents, pornographiques impliquant des
            mineurs, ou portant atteinte aux droits de tiers ;
          </li>
          <li>utiliser l&apos;apparence ou le visage d&apos;une personne sans son consentement ;</li>
          <li>
            porter atteinte à des droits de propriété intellectuelle, à la vie privée, au droit à l&apos;image ou à
            d&apos;autres droits de tiers ;
          </li>
          <li>
            copier, décompiler, désassembler, faire de l&apos;ingénierie inverse, extraire (scraping) ou perturber la
            Plateforme, ses serveurs ou ses dispositifs de sécurité ;
          </li>
          <li>
            réutiliser la Plateforme ou son Contenu pour entraîner ou améliorer un autre système d&apos;intelligence
            artificielle.
          </li>
        </ul>
        <p>
          Vous êtes seul responsable de l&apos;usage que vous faites de ChapCam. Toute violation de cette section peut
          entraîner la suspension immédiate de votre compte et votre signalement aux autorités compétentes.
        </p>
        <h3 className="mt-6 font-semibold text-foreground">6.1 Lutte contre le broutage et cadre légal ivoirien</h3>
        <p>
          En Côte d&apos;Ivoire, l&apos;escroquerie en ligne communément appelée «&nbsp;broutage&nbsp;»,
          l&apos;usurpation d&apos;identité numérique et les arnaques sentimentales constituent des infractions pénales.
          Elles sont notamment réprimées par la{" "}
          <strong>loi n° 2013-451 du 19 juin 2013 relative à la lutte contre la cybercriminalité</strong> ainsi que par
          les dispositions du Code pénal ivoirien relatives à l&apos;escroquerie, lesquelles prévoient des peines
          d&apos;emprisonnement et des amendes. Vous vous engagez à ne jamais utiliser la Plateforme pour préparer,
          faciliter ou commettre de tels actes.
        </p>
        <p>
          Indépendamment de votre lieu de résidence, vous demeurez tenu de respecter l&apos;ensemble des lois
          applicables sur votre territoire (protection des données personnelles, droit à l&apos;image, lutte contre la
          fraude, Règlement général sur la protection des données — RGPD — pour l&apos;Union européenne, etc.). En cas
          d&apos;usage frauduleux avéré, ChapCam conserve les preuves techniques disponibles (métadonnées, identifiants,
          marqueurs de traçabilité) et coopère avec les autorités compétentes, notamment, en Côte d&apos;Ivoire, la
          Plateforme de Lutte Contre la Cybercriminalité (PLCC) et la Direction de l&apos;Informatique et des Traces
          Technologiques (DITT).
        </p>
      </LegalSection>

      <LegalSection title="7. Votre Contenu et vos responsabilités">
        <p>
          Dans les limites permises par la loi, vous restez propriétaire de votre Entrée. Sous réserve du respect des
          présentes Conditions, ChapCam vous cède ses droits éventuels sur la Sortie générée pour vous. Vous pouvez
          utiliser votre Contenu à des fins personnelles ou commerciales, à condition de respecter ces Conditions et la
          loi applicable.
        </p>
        <p>
          Vous déclarez et garantissez détenir tous les droits, autorisations et consentements nécessaires sur
          l&apos;Entrée que vous fournissez, et que son utilisation au sein de la Plateforme ne viole aucune loi ni
          aucun droit de tiers. Si vous traitez des données personnelles de tiers via la Plateforme, vous êtes
          responsable d&apos;obtenir les consentements requis et de fournir les informations légales nécessaires.
        </p>
      </LegalSection>

      <LegalSection title="8. Données biométriques et faciales">
        <p>
          La Plateforme traite des données relatives au visage (géométrie faciale) afin de fournir la transformation en
          temps réel. Ces données peuvent constituer des données biométriques au sens des lois applicables. En utilisant
          ChapCam, vous consentez expressément à ce traitement pour les seules finalités de fonctionnement du service.
          Pour plus de détails sur la collecte, la conservation et vos droits, consultez notre{" "}
          <a href="/confidentialite" className="text-primary hover:underline">
            Politique de Confidentialité
          </a>
          . Vous pouvez retirer votre consentement à tout moment, étant entendu que cela peut vous priver de
          l&apos;accès à certaines fonctionnalités.
        </p>
      </LegalSection>

      <LegalSection title="9. Propriété intellectuelle">
        <p>
          La Plateforme, son logiciel, ses textes, graphismes, interfaces, marques, logos et tout autre élément (les «
          Éléments ») sont la propriété de ChapCam ou de ses concédants et sont protégés par le droit de la propriété
          intellectuelle. Aucun droit n&apos;est cédé en dehors de ce qui est expressément prévu par les présentes. Vous
          ne pouvez pas exploiter les Éléments sans notre accord écrit préalable. Si vous nous transmettez des
          suggestions ou retours, nous pourrons les utiliser librement, sans contrepartie ni obligation.
        </p>
      </LegalSection>

      <LegalSection title="10. Services et contenus tiers">
        <p>
          La Plateforme peut s&apos;interfacer avec des services tiers (plateformes de visioconférence, de streaming,
          fournisseurs de paiement, etc.) que nous ne contrôlons pas. Nous déclinons toute responsabilité quant au
          contenu, aux conditions d&apos;utilisation et aux pratiques de confidentialité de ces services. Nous vous
          invitons à consulter leurs propres conditions et politiques.
        </p>
      </LegalSection>

      <LegalSection title="11. Disponibilité et exactitude">
        <p>
          La Plateforme est fournie « en l&apos;état » et « selon disponibilité ». L&apos;intelligence artificielle étant
          de nature probabiliste, la Sortie peut contenir des imperfections, des erreurs ou des résultats inattendus.
          Nous ne garantissons pas que la Plateforme sera ininterrompue, exempte d&apos;erreurs, de bugs ou de failles de
          sécurité. La Plateforme peut être temporairement indisponible pour maintenance ou pour d&apos;autres raisons.
        </p>
      </LegalSection>

      <LegalSection title="12. Exclusion de garanties">
        <p>
          Dans les limites permises par la loi applicable, ChapCam exclut toute garantie expresse ou implicite, y
          compris toute garantie de qualité marchande, d&apos;adéquation à un usage particulier et d&apos;absence de
          contrefaçon. Certaines législations n&apos;autorisant pas l&apos;exclusion de certaines garanties, ces
          exclusions peuvent ne pas s&apos;appliquer à vous.
        </p>
      </LegalSection>

      <LegalSection title="13. Limitation de responsabilité">
        <p>
          Dans toute la mesure permise par la loi, ChapCam ne saurait être tenue responsable des dommages indirects,
          accessoires, spéciaux ou consécutifs, ni de toute perte de données, de revenus, de bénéfices ou de réputation,
          résultant de l&apos;utilisation ou de l&apos;impossibilité d&apos;utiliser la Plateforme. En tout état de
          cause, la responsabilité globale de ChapCam est limitée au montant des sommes que vous nous avez
          effectivement versées au cours des trois (3) mois précédant le fait générateur de responsabilité. Certaines
          juridictions n&apos;autorisant pas ces limitations, celles-ci peuvent ne pas s&apos;appliquer à vous, sans
          préjudice de vos droits impératifs de consommateur.
        </p>
      </LegalSection>

      <LegalSection title="14. Indemnisation">
        <p>
          Dans les limites permises par la loi, vous acceptez de garantir et de tenir ChapCam, ses dirigeants, employés
          et partenaires indemnes de toute réclamation, dommage, perte ou frais (y compris frais d&apos;avocat)
          découlant de : (i) votre utilisation de la Plateforme ; (ii) votre Contenu ; (iii) votre violation des
          présentes Conditions ; ou (iv) votre violation des droits de tiers ou de toute loi applicable.
        </p>
      </LegalSection>

      <LegalSection title="15. Durée, suspension et résiliation">
        <p>
          Les présentes Conditions s&apos;appliquent tant que vous utilisez la Plateforme. ChapCam peut, à sa seule
          discrétion, suspendre ou résilier votre accès à tout moment, avec ou sans motif, notamment en cas de violation
          des présentes Conditions. En cas de résiliation, vous devez cesser toute utilisation de la Plateforme. Les
          dispositions relatives au Contenu, à la propriété intellectuelle, à la confidentialité, aux garanties, à la
          limitation de responsabilité et à l&apos;indemnisation survivent à la résiliation.
        </p>
      </LegalSection>

      <LegalSection title="16. Droit applicable et litiges">
        <p>
          Les présentes Conditions sont régies par le droit français. En cas de litige, et après une tentative de
          résolution amiable, les tribunaux français seront compétents, sous réserve des règles impératives de
          protection applicables aux consommateurs qui vous accorderaient la compétence des tribunaux de votre lieu de
          résidence. Conformément à la réglementation, vous pouvez également recourir à un médiateur de la consommation.
        </p>
      </LegalSection>

      <LegalSection title="17. Divisibilité et intégralité">
        <p>
          Si une disposition des présentes Conditions est jugée invalide, les autres dispositions demeurent pleinement
          applicables. Les présentes Conditions, avec la Politique de Confidentialité, constituent l&apos;intégralité de
          l&apos;accord entre vous et ChapCam concernant la Plateforme.
        </p>
      </LegalSection>

      <LegalSection title="18. Contact">
        <p>
          Pour toute question relative aux présentes Conditions, contactez-nous à{" "}
          <a href="mailto:contact@chapcam.com" className="text-primary hover:underline">
            contact@chapcam.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  )
}
