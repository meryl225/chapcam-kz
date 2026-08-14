/**
 * Dictionnaire de traduction FR -> EN.
 *
 * Convention : la CLE est le texte francais exact utilise dans le code
 * (la "source"). En anglais, on renvoie la valeur ci-dessous ; si une cle est
 * absente, le composant retombe automatiquement sur le francais.
 *
 * Pour traduire une nouvelle chaine : enveloppez-la dans t("...") dans le
 * composant, puis ajoutez l'entree correspondante ici.
 */
export const translations: Record<string, string> = {
  // ----- Header / navigation -----
  "Comment ça marche": "How it works",
  Roadmap: "Roadmap",
  Tarifs: "Pricing",
  Télécharger: "Download",
  Founder: "Founder",
  Partenariat: "Partnership",
  "Se connecter": "Sign in",
  "S'inscrire gratuitement": "Sign up for free",
  "SWAP EN TEMPS REEL": "REAL-TIME SWAP",

  // ----- Hero -----
  "N°1 des outils de transformation en direct": "The #1 live transformation tool",
  "La caméra IA": "The AI camera",
  des: "for",
  créateurs: "creators",
  "gamers.": "gamers.",
  "Change de visage et de corps en temps réel pour tes streams, vidéos, appels et réseaux sociaux. Garde tes mouvements. Reste toi, deviens quelqu'un d'autre.":
    "Change your face and body in real time for your streams, videos, calls and social media. Keep your movements. Stay yourself, become someone else.",
  "Temps réel": "Real time",
  "30 FPS fluide": "Smooth 30 FPS",
  "Ultra HD 4K": "Ultra HD 4K",
  "Faible latence": "Low latency",
  Sécurisé: "Secure",
  "Commencer gratuitement": "Start for free",
  "Voir la démo": "Watch the demo",
  "Créateur inscrit": "Registered creator",
  "+15 000 créateurs": "+15,000 creators",
  "déjà inscrits": "already signed up",
  "Fonctionne avec": "Works with",
  "Disponible en Afrique de l'Ouest & Centrale": "Available in West & Central Africa",
  Partenaire: "Partner",
  "Numéros virtuels, SMS OTP & proxies premium": "Virtual numbers, SMS OTP & premium proxies",
  Obtenir: "Get it",
  "Démo ChapCam": "ChapCam demo",
  "Fermer la démo": "Close the demo",

  // ----- Selecteur de langue -----
  Langue: "Language",
  Français: "French",
  Anglais: "English",

  // ----- Section outils (ToolsShowcase) -----
  "Nos outils IA": "Our AI tools",
  "Une suite complete pour": "A complete suite to",
  "creer sans limites": "create without limits",
  "Change ton visage, anime tes photos et traduis tes videos : tout ce qu'il te faut en un seul endroit.":
    "Change your face, animate your photos and translate your videos: everything you need in one place.",
  "Change de visage en temps reel dans tous tes appels et streams, en gardant tes mouvements.":
    "Change your face in real time across all your calls and streams, keeping your movements.",
  "TEMPS REEL": "REAL TIME",
  "Photos en Video": "Photos to Video",
  "Anime n'importe quelle photo et transforme-la en video vivante en quelques secondes.":
    "Animate any photo and turn it into a living video in seconds.",
  NOUVEAU: "NEW",
  "Donne vie a tes images avec des mouvements de camera realistes et fluides pilotes par l'IA.":
    "Bring your images to life with realistic, smooth AI-driven camera movements.",
  "Traducteur de Video": "Video Translator",
  "Traduis et double automatiquement tes videos dans plus de 190 langues, avec ta voix.":
    "Automatically translate and dub your videos into 190+ languages, in your own voice.",
  "Essayer maintenant": "Try it now",

  // ----- Section createurs (CreatorsSection) -----
  "Pour tous les créateurs": "For every creator",
  "Une seule caméra. Des": "One camera.",
  "possibilités infinies.": "Endless possibilities.",
  "Anime tes lives avec un avatar unique.": "Bring your live streams to life with a unique avatar.",
  "Créateurs de contenu": "Content creators",
  "Crée des vidéos virales sans te montrer.": "Create viral videos without showing yourself.",
  "Incarnation totale dans tes jeux.": "Total immersion in your games.",
  "Appels & Réunions": "Calls & Meetings",
  "Garde ton anonymat en toutes circonstances.": "Keep your anonymity in any situation.",
  "Deviens ton propre personnage.": "Become your own character.",
  Entreprises: "Businesses",
  "Présentations, support et formations.": "Presentations, support and training.",

  // ----- Section roadmap (RoadmapSection) -----
  "5 PHASES": "5 PHASES",
  "POUR TRANSFORMER": "TO TRANSFORM",
  "TON IDENTITE, TON STYLE, TON MONDE.": "YOUR IDENTITY, YOUR STYLE, YOUR WORLD.",
  "TRANSFORMATION CORPS ET VISAGE ENTIER EN TEMPS REEL":
    "FULL FACE AND BODY TRANSFORMATION IN REAL TIME",
  "Change completement ton apparence en direct. Visage, corps, style : deviens qui tu veux, quand tu veux.":
    "Completely change your appearance live. Face, body, style: become whoever you want, whenever you want.",
  "Transforme ton visage et ton corps entier": "Transform your face and entire body",
  "Des styles realistes et varies": "Realistic and varied styles",
  "Fluide, rapide et naturel": "Smooth, fast and natural",
  "2026 - MAINTENANT": "2026 - NOW",
  "LE DEBUT DE TA NOUVELLE IDENTITE.": "THE BEGINNING OF YOUR NEW IDENTITY.",
  "EXPERIENCE AMELIOREE": "ENHANCED EXPERIENCE",
  "Plus de stabilite, plus de realisme et une experience quotidienne encore plus agreable.":
    "More stability, more realism and an even more enjoyable everyday experience.",
  "Rendu encore plus naturel et realiste": "Even more natural and realistic rendering",
  "Plus stable, plus agreable": "More stable, more enjoyable",
  "Concu pour tous tes moments": "Designed for all your moments",
  "PLUS DE REALISME. PLUS DE PLAISIR.": "MORE REALISM. MORE FUN.",
  "AJOUT DE LA MODIFICATION VOCALE": "VOICE MODIFICATION ADDED",
  "Change ta voix en temps reel et choisis celle qui te represente le mieux.":
    "Change your voice in real time and pick the one that represents you best.",
  "Change ta voix instantanement": "Change your voice instantly",
  "Plusieurs voix disponibles": "Multiple voices available",
  "Ta voix, ta liberte, en toute securite": "Your voice, your freedom, safely",
  "TA VOIX. TON CHOIX. TON POUVOIR.": "YOUR VOICE. YOUR CHOICE. YOUR POWER.",
  "EXPERIENCE VOCALE ULTRA REALISTE": "ULTRA-REALISTIC VOICE EXPERIENCE",
  "Des voix ultra naturelles, emotionnelles et immersives comme jamais auparavant.":
    "Ultra-natural, emotional and immersive voices like never before.",
  "Voix ultra naturelles et vivantes": "Ultra-natural and lifelike voices",
  "Exprime toutes tes emotions": "Express all your emotions",
  "Qualite professionnelle pour tous": "Professional quality for everyone",
  "TA VOIX PREND VIE. SANS LIMITES.": "YOUR VOICE COMES ALIVE. WITHOUT LIMITS.",
  "LE FUTUR SANS LIMITES": "THE FUTURE WITHOUT LIMITS",
  "Encore plus de liberte, de creativite et de possibilites grace aux technologies de demain.":
    "Even more freedom, creativity and possibilities thanks to tomorrow's technologies.",
  "Encore plus de styles et d'options": "Even more styles and options",
  "Partage, connecte et inspire": "Share, connect and inspire",
  "Une experience mondiale et evolutive": "A global and scalable experience",
  "2027 ET AU-DELA": "2027 AND BEYOND",
  "LE FUTUR T'APPARTIENT. NOUS LE CREONS AVEC TOI.":
    "THE FUTURE IS YOURS. WE BUILD IT WITH YOU.",
  "NOTRE MISSION": "OUR MISSION",
  "Donner a chacun le pouvoir de devenir qui il veut, quand il veut, avec liberte, creativite et confiance.":
    "Give everyone the power to become whoever they want, whenever they want, with freedom, creativity and confidence.",
  "SECURITE AVANT TOUT": "SAFETY FIRST",
  "POUR TOUT LE MONDE": "FOR EVERYONE",
  "INNOVATION CONTINUE": "CONTINUOUS INNOVATION",
  "PASSION & COMMUNAUTE": "PASSION & COMMUNITY",

  // ----- Section en action (InActionSection) -----
  "EN ACTION": "IN ACTION",
  "Regardez ChapCam": "Watch ChapCam",
  transformer: "transform",
  "en temps reel": "in real time",
  "Transformation du visage et du corps entier avec mouvements naturels et sans delai":
    "Full face and body transformation with natural movements and no delay",
  "Clique sur la galerie pour l'agrandir - ChapCam en action":
    "Click the gallery to enlarge it - ChapCam in action",
  "Fonctionne pendant tes appels video": "Works during your video calls",

  // ----- Section tarifs (PricingSection) -----
  "Changez d'apparence en live": "Change your appearance live",
  "avec ChapCam": "with ChapCam",
  "2 points = 1 seconde de transformation du visage et corps entier":
    "2 points = 1 second of full face and body transformation",
  "Nouveau · Sorti le 17 juillet": "New · Released July 17",
  "Ces recharges alimentent ChapCam 2.0": "These top-ups power ChapCam 2.0",
  "Toutes les offres ci-dessous sont destinees a notre nouveau logiciel":
    "All the offers below are for our new software",
  ", qui fonctionne desormais avec": ", which now works with",
  "tout type de PC": "any type of PC",
  "et permet meme de": "and even lets you",
  "changer la couleur de peau": "change skin color",
  "Compatible avec tout type de PC": "Works with any type of PC",
  "Changement de la couleur de peau": "Skin color change",
  "1 JOUR": "1 DAY",
  "90 JOURS": "90 DAYS",
  "365 JOURS": "365 DAYS",
  "Valable 24 heures": "Valid for 24 hours",
  "Valable 3 mois": "Valid for 3 months",
  "Valable 1 an": "Valid for 1 year",
  "Transformation du visage et corps entier": "Full face and body transformation",
  "Qualite HD 1080p": "HD 1080p quality",
  "Rendu sans logo ChapCam inclus": "ChapCam logo-free rendering included",
  "Qualite 4K Ultra HD": "4K Ultra HD quality",
  "Support prioritaire": "Priority support",
  "Rendu Full HD 1080p sans logo": "Logo-free Full HD 1080p rendering",
  "Studio CHAPCAM : scènes en direct (décors, styles, effets)":
    "CHAPCAM Studio: live scenes (backgrounds, styles, effects)",
  "Prompts personnalisés en direct + Enhance": "Live custom prompts + Enhance",
  "Suivi temps réel : chrono précis & qualité réseau":
    "Real-time tracking: precise timer & network quality",
  "Support VIP 24/7": "24/7 VIP support",
  "Acces aux nouveautes en avant-premiere": "Early access to new features",
  "Studio CHAPCAM complet : scènes en direct (décors, styles, effets, arrière-plans)":
    "Full CHAPCAM Studio: live scenes (backgrounds, styles, effects, backdrops)",
  "Prompts personnalisés illimités en direct + Enhance":
    "Unlimited live custom prompts + Enhance",
  "Support VIP prioritaire 24/7": "Priority 24/7 VIP support",
  "Acces anticipe a toutes les nouveautes": "Early access to all new features",
  "MEILLEURE OFFRE": "BEST OFFER",
  POPULAIRE: "POPULAR",
  "Avec logo ChapCam": "With ChapCam logo",
  "Filigrane visible sur le rendu": "Visible watermark on the output",
  "Sans logo (automatique)": "Logo-free (automatic)",
  "Sans logo (sur demande)": "Logo-free (on request)",
  "Retrait du logo inclus, active automatiquement":
    "Logo removal included, activated automatically",
  "Retrait du logo active par notre equipe": "Logo removal activated by our team",
  "Cadeau inclus": "Gift included",
  "Changeur de voix i9 offert": "Free i9 voice changer",
  "Boîtier + accessoires livrés": "Device + accessories delivered",
  Recharger: "Top up",
  "Offre valable jusqu'au 1er Septembre 2026 ou jusqu'a epuisement des places.":
    "Offer valid until September 1, 2026 or while spots last.",
  "Moyens de paiement acceptes": "Accepted payment methods",
  "Carte bancaire": "Bank card",
  "Visa & Mastercard acceptees": "Visa & Mastercard accepted",
  Cryptomonnaie: "Cryptocurrency",
  "Bitcoin, USDT, ETH & plus": "Bitcoin, USDT, ETH & more",
  "Paiement securise via PayDunya (mobile money & carte) ou Trybit (crypto)":
    "Secure payment via PayDunya (mobile money & card) or Trybit (crypto)",
}
