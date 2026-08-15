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
  "Studio Photo en Vidéo :": "Photo to Video Studio:",
  "vidéos de 30s incluses": "30s videos included",
  "Afficher les prix en": "Show prices in",
  "Montants convertis a titre indicatif. Vous serez debite en FCFA (XOF).":
    "Amounts converted for reference only. You will be charged in FCFA (XOF).",
  "Moyens de paiement acceptes": "Accepted payment methods",
  "Carte bancaire": "Bank card",
  "Visa & Mastercard acceptees": "Visa & Mastercard accepted",
  Cryptomonnaie: "Cryptocurrency",
  "Bitcoin, USDT, ETH & plus": "Bitcoin, USDT, ETH & more",
  "Paiement securise via PayDunya (mobile money & carte) ou NOWPayments (crypto)":
    "Secure payment via PayDunya (mobile money & card) or NOWPayments (crypto)",

  // ----- Section pays disponibles (AvailableCountriesSection) -----
  "Carte bancaire & Mobile Money acceptes": "Bank card & Mobile Money accepted",
  "Payez depuis": "Pay from",
  "pays": "countries",
  "Le Mobile Money (Orange Money, MTN, Moov, Wave, M-Pesa, Airtel...) est disponible dans les pays ci-dessous, et la carte bancaire Visa / Mastercard partout dans le monde.":
    "Mobile Money (Orange Money, MTN, Moov, Wave, M-Pesa, Airtel...) is available in the countries below, and Visa / Mastercard bank cards everywhere in the world.",
  "autres pays": "other countries",
  "Carte bancaire Visa / Mastercard acceptee partout dans le monde.":
    "Visa / Mastercard bank cards accepted everywhere in the world.",

  // ----- Section comment ca marche (HowItWorksSection) -----
  "Comment ca marche": "How it works",
  "Inscris-toi": "Sign up",
  "Cree ton compte et accede instantanement a ChapCam.":
    "Create your account and get instant access to ChapCam.",
  "Choisis ton apparence": "Choose your look",
  "Selectionne le visage et le corps que tu veux utiliser en temps reel.":
    "Select the face and body you want to use in real time.",
  "Lance ton stream ou appel": "Start your stream or call",
  "Utilise ChapCam sur toutes tes plateformes preferees en temps reel.":
    "Use ChapCam on all your favorite platforms in real time.",
  "Compatible avec": "Works with",

  // ----- Section FAQ (FAQSection) -----
  FAQ: "FAQ",
  Questions: "Frequently",
  frequentes: "asked questions",
  "Tout ce que vous devez savoir sur ChapCam et le face swap en temps reel":
    "Everything you need to know about ChapCam and real-time face swap",
  "Vous avez d'autres questions ?": "Have more questions?",
  "Contactez-nous sur WhatsApp": "Contact us on WhatsApp",
  "Qu'est-ce que ChapCam ?": "What is ChapCam?",
  "ChapCam est une application de transformation faciale en temps reel qui vous permet de changer votre apparence pendant vos appels video. Rendez-vous sur chapcam.com pour decouvrir toutes nos fonctionnalites.":
    "ChapCam is a real-time facial transformation app that lets you change your appearance during video calls. Visit chapcam.com to discover all our features.",
  "Est-ce que ca fonctionne avec WhatsApp, Zoom, Teams ?":
    "Does it work with WhatsApp, Zoom, Teams?",
  "Oui ! ChapCam fonctionne avec toutes les applications de visioconference : WhatsApp, Telegram, Zoom, Microsoft Teams, Google Meet, Discord, Skype, TikTok Live, et bien d'autres. Plus d'infos sur chapcam.com.":
    "Yes! ChapCam works with all video conferencing apps: WhatsApp, Telegram, Zoom, Microsoft Teams, Google Meet, Discord, Skype, TikTok Live, and many more. More info on chapcam.com.",
  "Quels sont les tarifs disponibles ?": "What pricing plans are available?",
  "ChapCam propose plusieurs formules adaptees a vos besoins : Starter (10 000 FCFA pour 1 jour), Premium (50 000 FCFA pour 90 jours), VIP PRO (85 000 FCFA pour 365 jours) et VIP DEBOUT (150 000 FCFA, 60 min). Consultez tous les details sur chapcam.com.":
    "ChapCam offers several plans to fit your needs: Starter (10,000 FCFA for 1 day), Premium (50,000 FCFA for 90 days), VIP PRO (85,000 FCFA for 365 days) and VIP DEBOUT (150,000 FCFA, 60 min). See all details on chapcam.com.",
  "Comment fonctionnent les points ?": "How do points work?",
  "2 points = 1 seconde de transformation. Le plan Starter offre 500 points (4 min 10 sec), Premium offre 2 500 points (20 min 50 sec), VIP PRO offre 4 250 points (35 min 25 sec) et VIP DEBOUT offre 7 200 points (60 min).":
    "2 points = 1 second of transformation. The Starter plan offers 500 points (4 min 10 sec), Premium offers 2,500 points (20 min 50 sec), VIP PRO offers 4,250 points (35 min 25 sec) and VIP DEBOUT offers 7,200 points (60 min).",
  "Mes donnees sont-elles securisees ?": "Is my data secure?",
  "Absolument. Chez ChapCam, la securite de vos donnees est notre priorite. Vos informations sont protegees et nous ne les partageons jamais avec des tiers.":
    "Absolutely. At ChapCam, the security of your data is our priority. Your information is protected and we never share it with third parties.",
  "Comment contacter le support ?": "How do I contact support?",
  "Vous pouvez nous contacter via WhatsApp au +225 05 55 56 01 89 pour une assistance rapide. Notre equipe ChapCam repond generalement sous 24 heures. Visitez chapcam.com pour plus d'options de contact.":
    "You can reach us on WhatsApp at +225 05 55 56 01 89 for quick assistance. Our ChapCam team usually replies within 24 hours. Visit chapcam.com for more contact options.",

  // ----- Section tutoriel (TutorialSection) -----
  "Guides d'installation": "Installation guides",
  "Comment utiliser ChapCam ?": "How to use ChapCam?",
  "Choisissez le guide adapte a votre utilisation": "Choose the guide that fits your use case",
  "Guide WhatsApp": "WhatsApp Guide",
  "Avec NDI (Recommande)": "With NDI (Recommended)",
  "Guide General": "General Guide",
  "Avec OBS Studio": "With OBS Studio",
  "NDI est recommande pour WhatsApp et Telegram car OBS Virtual Camera n'est pas compatible avec ces applications.":
    "NDI is recommended for WhatsApp and Telegram because OBS Virtual Camera isn't compatible with these apps.",
  "OBS est ideal pour les appels video sur Zoom, Teams, Discord et le streaming sur TikTok Live.":
    "OBS is ideal for video calls on Zoom, Teams, Discord and streaming on TikTok Live.",
  ETAPE: "STEP",
  "Etape": "Step",
  "Instructions:": "Instructions:",
  "Etape suivante": "Next step",
  "Vous etes pret a utiliser ChapCam!": "You're ready to use ChapCam!",
  "Compatible avec:": "Works with:",
  "Ideal pour:": "Ideal for:",
  "Telecharger gratuitement:": "Download for free:",
  "Telecharger OBS Studio": "Download OBS Studio",
  "Telecharger NDI Tools": "Download NDI Tools",
  "Configurer ChapCam dans OBS": "Set up ChapCam in OBS",
  "Ajoutez votre flux ChapCam comme source video.": "Add your ChapCam feed as a video source.",
  "Demarrer la Camera Virtuelle": "Start the Virtual Camera",
  "Activez la camera virtuelle OBS.": "Enable the OBS virtual camera.",
  "Utiliser dans Zoom, Teams, Discord...": "Use in Zoom, Teams, Discord...",
  "Selectionnez 'OBS Virtual Camera' dans vos apps.": "Select 'OBS Virtual Camera' in your apps.",
  "Installez OBS Studio gratuitement sur votre PC.": "Install OBS Studio for free on your PC.",
  "Allez sur obsproject.com": "Go to obsproject.com",
  "Telechargez la version pour votre systeme (Windows/Mac)":
    "Download the version for your system (Windows/Mac)",
  "Installez OBS Studio": "Install OBS Studio",
  "Ouvrez OBS Studio": "Open OBS Studio",
  "Cliquez sur '+' dans Sources": "Click '+' under Sources",
  "Selectionnez 'Capture de fenetre'": "Select 'Window Capture'",
  "Choisissez la fenetre ChapCam": "Choose the ChapCam window",
  "Dans OBS, cliquez sur 'Demarrer la camera virtuelle'":
    "In OBS, click 'Start Virtual Camera'",
  "La camera virtuelle est maintenant active": "The virtual camera is now active",
  "Elle apparaitra dans vos applications": "It will appear in your applications",
  "Ouvrez Zoom, Teams, Discord ou TikTok Live": "Open Zoom, Teams, Discord or TikTok Live",
  "Allez dans les parametres video": "Go to the video settings",
  "Selectionnez 'OBS Virtual Camera'": "Select 'OBS Virtual Camera'",
  "Lancez votre appel avec votre nouveau visage!": "Start your call with your new face!",
  "Telecharger NDI Tools ": "Download NDI Tools",
  "NDI cree une camera virtuelle compatible WhatsApp.":
    "NDI creates a WhatsApp-compatible virtual camera.",
  "Allez sur ndi.tv/tools": "Go to ndi.tv/tools",
  "Telechargez 'NDI Tools' pour Windows ou Mac": "Download 'NDI Tools' for Windows or Mac",
  "Installez NDI Tools (inclut NDI Virtual Input)":
    "Install NDI Tools (includes NDI Virtual Input)",
  "Lancer ChapCam en mode NDI": "Launch ChapCam in NDI mode",
  "Activez la sortie NDI dans ChapCam.": "Enable NDI output in ChapCam.",
  "Ouvrez ChapCam et demarrez votre swap": "Open ChapCam and start your swap",
  "Dans les parametres, activez 'Sortie NDI'": "In the settings, enable 'NDI Output'",
  "ChapCam diffuse maintenant en NDI": "ChapCam is now broadcasting over NDI",
  "Configurer NDI Virtual Input": "Set up NDI Virtual Input",
  "Selectionnez ChapCam comme source NDI.": "Select ChapCam as the NDI source.",
  "Ouvrez 'NDI Virtual Input' (barre des taches)":
    "Open 'NDI Virtual Input' (taskbar)",
  "Cliquez droit sur l'icone NDI": "Right-click the NDI icon",
  "Selectionnez 'ChapCam' comme source": "Select 'ChapCam' as the source",
  "La camera virtuelle NDI est active": "The NDI virtual camera is active",
  "Utiliser dans WhatsApp ou Telegram": "Use in WhatsApp or Telegram",
  "Selectionnez 'NDI Video' dans vos apps.": "Select 'NDI Video' in your apps.",
  "Ouvrez WhatsApp Desktop ou Telegram": "Open WhatsApp Desktop or Telegram",
  "Lancez un appel video": "Start a video call",
  "Dans les parametres camera, selectionnez 'NDI Video'":
    "In the camera settings, select 'NDI Video'",
  "Votre visage transforme apparait dans l'appel!":
    "Your transformed face appears in the call!",

  // ----- Footer (SiteFooter) -----
  "Plateforme d'intelligence artificielle responsable. © {year} ChapCam. Tous droits réservés.":
    "Responsible artificial intelligence platform. © {year} ChapCam. All rights reserved.",
  "ESIM ChapCam": "ChapCam eSIM",
  "Conditions d'utilisation": "Terms of use",
  "Politique de confidentialité": "Privacy policy",
  "Politique de remboursement": "Refund policy",
  "Contact juridique": "Legal contact",
  "Signaler un abus": "Report abuse",
  "Liens légaux": "Legal links",

  // ----- Section fondateur (FounderSection) -----
  FONDATEUR: "FOUNDER",
  "La vision derriere": "The vision behind",
  "CEO & Founder — ChapCam": "CEO & Founder — ChapCam",
  "Senior Developer & AI Builder focused on real-time face swap and immersive communication technologies.":
    "Senior Developer & AI Builder focused on real-time face swap and immersive communication technologies.",

  // ----- Section partenariat (PartnershipSection) -----
  PARTENARIAT: "PARTNERSHIP",
  Travaillons: "Let's work",
  ensemble: "together",
  "Créateur, agence, revendeur ou média ? Contacte l'équipe ChapCam pour un partenariat, une collaboration ou toute question. On te répond rapidement par mail ou sur WhatsApp.":
    "Creator, agency, reseller or media? Reach out to the ChapCam team for a partnership, collaboration or any question. We reply quickly by email or on WhatsApp.",
  "Réponse rapide, assistance en direct": "Fast response, live assistance",
  "Écrire sur WhatsApp": "Message us on WhatsApp",
  Email: "Email",
  "Pour les demandes détaillées & pros": "For detailed & professional requests",
  "Nous envoyer un mail": "Send us an email",

  // ----- Maquette studio (StreamStudio) -----
  Avant: "Before",
  Après: "After",
  Visage: "Face",
  Corps: "Body",
  "Sélection d'avatar": "Avatar selection",
  Similarité: "Similarity",
  Expression: "Expression",
  Éclairage: "Lighting",
  Netteté: "Sharpness",
  "Appliquer en direct": "Apply live",
  Spectateurs: "Viewers",
  "aujourd'hui": "today",
  "Chat en direct": "Live chat",
  "Envoyer un message…": "Send a message…",
  "En live sur": "Live on",
  "Incroyable !!": "Amazing!!",
  "Wshh c'est trop réel": "Whoa this is too real",
  "La qualité est insane !": "The quality is insane!",
  "Tu utilises quel setup ?": "What setup are you using?",
  "ChapCam best tool": "ChapCam best tool",
  "on dirait un vrai jeu": "looks like a real game",

  // ----- Dashboard : sidebar -----
  "Swap en temps réel": "Real-time swap",
  "Outils premium": "Premium tools",
  Gratuit: "Free",
  Expire: "Expired",
  "Points restants": "Points left",
  "min de swap": "min of swap",
  "Avatars utilises": "Avatars used",
  "Recharge tes points pour continuer": "Top up your points to continue",
  "VOIR LES OFFRES": "SEE OFFERS",
  Deconnexion: "Log out",
  "AIDE & SUPPORT": "HELP & SUPPORT",
  "ADMIN STATS": "ADMIN STATS",
  "Menu de navigation": "Navigation menu",
  RECHARGER: "TOP UP",
  "Recharge une offre ChapVoice pour activer le changement de voix":
    "Top up a ChapVoice offer to enable voice changing",
  "Tu as epuise tes points — Recharge pour continuer le swap":
    "You've run out of points — Top up to keep swapping",
  "Tu es sur le plan gratuit — Active un abonnement pour demarrer le swap":
    "You're on the free plan — Activate a subscription to start swapping",
  // Outils IA (titres + descriptions sidebar)
  "Live Swap": "Live Swap",
  "Change de visage en direct": "Change your face live",
  "Photos en Vidéo": "Photos to Video",
  "Anime ta photo en vidéo": "Animate your photo into video",
  Motion: "Motion",
  "Anime ta photo en 3D": "Animate your photo in 3D",
  "Traduction Vidéo": "Video Translation",
  "Traduis ta vidéo en 190+ langues": "Translate your video into 190+ languages",
  ChapSim: "ChapSim",
  "SMS OTP & proxy privé": "SMS OTP & private proxy",
  "Voice Swap": "Voice Swap",
  "Change ta voix en temps réel": "Change your voice in real time",
  "Voice Traducteur": "Voice Translator",
  "Traduis et clone ta voix": "Translate and clone your voice",
  "Mes Avatars": "My Avatars",
  "Personnages IA réalistes": "Realistic AI characters",
  // Labels utilitaires nav
  STATISTIQUES: "STATISTICS",
  PARAMETRES: "SETTINGS",

  // ----- Dashboard : page Recharger (plans) -----
  "PAIEMENT EN LIGNE SECURISE": "SECURE ONLINE PAYMENT",
  "Payez par": "Pay by",
  "Carte bancaire, Wave, Orange, MTN, Moov ou Djamo":
    "Bank card, Wave, Orange, MTN, Moov or Djamo",
  "via PayDunya": "via PayDunya",
  "ou en": "or in",
  "via NOWPayments": "via NOWPayments",
  "Activation automatique de votre compte des que le paiement est confirme.":
    "Your account is activated automatically once the payment is confirmed.",
  "Changez d'apparence en live": "Change your appearance live",
  "avec ChapCam": "with ChapCam",
  "2 points = 1 seconde de transformation du visage et corps entier":
    "2 points = 1 second of full face and body transformation",
  "Paiement 100% securise et instantane. Apres avoir paye, patientez quelques secondes sur la page PayDunya : votre compte est credite automatiquement des la confirmation.":
    "100% secure and instant payment. After paying, wait a few seconds on the PayDunya page: your account is credited automatically once confirmed.",
  "Nouveau · Sorti le 17 juillet": "New · Released July 17",
  "Ces recharges alimentent ChapCam 2.0": "These top-ups power ChapCam 2.0",
  "Toutes les offres ci-dessous sont destinees a notre nouveau logiciel":
    "All the offers below are for our new software",
  ", qui fonctionne desormais avec": ", which now works with",
  "tout type de PC": "any type of PC",
  "et permet meme de": "and even lets you",
  "changer la couleur de peau": "change skin color",
  "Compatible avec tout type de PC": "Compatible with any type of PC",
  "Changement de la couleur de peau": "Skin color change",
  POPULAIRE: "POPULAR",
  "MEILLEURE OFFRE": "BEST OFFER",
  "Édition VIP": "VIP Edition",
  "Avec logo ChapCam": "With ChapCam logo",
  "Filigrane visible sur le rendu": "Watermark visible on the output",
  "Sans logo (automatique)": "No logo (automatic)",
  "Sans logo (sur demande)": "No logo (on request)",
  "Retrait du logo inclus, active automatiquement":
    "Logo removal included, activated automatically",
  "Retrait du logo active par notre equipe": "Logo removal activated by our team",
  "Cadeau inclus": "Gift included",
  points: "points",
  "{n} vidéos de 30s incluses": "{n} 30s videos included",
  "Activation automatique et immediate apres confirmation du paiement.":
    "Automatic and immediate activation after payment confirmation.",
  "Retour au tableau de bord": "Back to dashboard",
  "Cryptomonnaies acceptees : Bitcoin, Ethereum, USDT, TON, BNB":
    "Accepted cryptocurrencies: Bitcoin, Ethereum, USDT, TON, BNB",
  // Durees des forfaits
  "1 Jour": "1 Day",
  "90 Jours": "90 Days",
  "365 Jours": "365 Days",
  // Caracteristiques des forfaits
  "Transformation du visage et corps entier": "Full face and body transformation",
  "Qualite HD": "HD quality",
  "Rendu sans logo ChapCam inclus": "Logo-free output included",
  "Qualite 4K Ultra HD": "4K Ultra HD quality",
  "Support prioritaire": "Priority support",
  "Rendu Full HD 1080p sans logo": "Logo-free Full HD 1080p output",
  "Studio CHAPCAM : scènes en direct (décors, styles, effets, arrière-plans)":
    "CHAPCAM Studio: live scenes (sets, styles, effects, backgrounds)",
  "Prompts personnalisés en direct + Enhance": "Custom live prompts + Enhance",
  "Suivi temps réel : chrono précis & qualité réseau":
    "Real-time tracking: precise timer & network quality",
  "Support VIP 24/7": "24/7 VIP support",
  "Acces aux nouveautes": "Access to new features",
  "Studio CHAPCAM complet : scènes en direct (décors, styles, effets, arrière-plans)":
    "Full CHAPCAM Studio: live scenes (sets, styles, effects, backgrounds)",
  "Prompts personnalisés illimités en direct + Enhance":
    "Unlimited custom live prompts + Enhance",
  "Support VIP prioritaire 24/7": "Priority 24/7 VIP support",
  "Acces anticipe a toutes les nouveautes": "Early access to all new features",

  // ----- Modal de paiement partage -----
  Fermer: "Close",
  "Finalisez votre paiement": "Complete your payment",
  "Paiement sécurisé et activation automatique après confirmation.":
    "Secure payment and automatic activation after confirmation.",
  "Pays de paiement": "Payment country",
  "Rechercher un pays…": "Search a country…",
  "Aucun pays trouvé.": "No country found.",
  "Moyen de paiement": "Payment method",
  "Sélectionnez votre méthode de paiement": "Select your payment method",
  Recommandé: "Recommended",
  "Paiement par carte bancaire": "Bank card payment",
  "Paiement rapide et sécurisé": "Fast and secure payment",
  "Autres moyens de paiement": "Other payment methods",
  "Payer en cryptomonnaie": "Pay with cryptocurrency",
  "Bitcoin, USDT, ETH et plus de 200 cryptos acceptées":
    "Bitcoin, USDT, ETH and 200+ cryptos accepted",
  "Récapitulatif de la commande": "Order summary",
  "Plan sélectionné": "Selected plan",
  Montant: "Amount",
  "Frais de transaction": "Transaction fees",
  "Total à payer": "Total to pay",
  "Redirection…": "Redirecting…",
  "Continuer le paiement": "Continue payment",
  "Paiement sécurisé": "Secure payment",
  "Activation automatique": "Automatic activation",
  "Données cryptées": "Encrypted data",
  "SSL 256 bits": "256-bit SSL",
  "Conformité PCI DSS": "PCI DSS compliance",
  "Paiements sécurisés": "Secure payments",
  "Support 24/7": "24/7 support",
  "Nous sommes là pour vous": "We're here for you",
  "Vos données sont protégées par un chiffrement de niveau bancaire.":
    "Your data is protected with bank-level encryption.",
  "Plateforme vérifiée": "Verified platform",

  // ----- Dashboard : accueil (hub) -----
  "Compte gratuit": "Free account",
  "Plan 1 jour": "1-day plan",
  "Plan 30 jours": "30-day plan",
  "Plan 90 jours": "90-day plan",
  "Plan 365 jours": "365-day plan",
  restantes: "left",
  Bonjour: "Hello",
  "Transforme ton apparence et ta voix en temps réel avec l’IA.":
    "Transform your appearance and voice in real time with AI.",
  "Lancer le Live Swap": "Start Live Swap",
  "Tous les outils ChapCam": "All ChapCam tools",
  "Choisis l’outil que tu souhaites utiliser.": "Choose the tool you want to use.",
  "Utilisation rapide": "Quick usage",
  "Swaps aujourd’hui": "Swaps today",
  "Minutes restantes": "Minutes left",
  "Avatars créés": "Avatars created",
  "Temps aujourd’hui": "Time today",
  "Passe en Pro et débloque tout ChapCam": "Go Pro and unlock all of ChapCam",
  "Plus de crédits": "More credits",
  "Qualité 4K": "4K quality",
  "Avatars premium": "Premium avatars",
  "Voir les offres": "See offers",

  // ----- Dashboard : grille d'outils -----
  Actif: "Active",
  Nouveau: "New",
  Ouvrir: "Open",
  "Traduction de Vidéo": "Video Translation",

  // ----- Dashboard : actions rapides (header) -----
  "Actions rapides": "Quick actions",
  "Ajoute des crédits de swap": "Add swap credits",
  "Mes demandes": "My requests",
  "Suivi de tes requêtes": "Track your requests",
  "Demande d'installation": "Installation request",
  "On installe ChapCam pour toi": "We install ChapCam for you",

  // ----- Dashboard : promo ChapSim -----
  "Numéros virtuels premium": "Premium virtual numbers",
  "Reçois tes SMS OTP et achète des numéros & proxies dans le monde entier.":
    "Receive your OTP SMS and buy numbers & proxies worldwide.",
  "180+ pays": "180+ countries",
  Proxies: "Proxies",
  "Obtenir ChapSim": "Get ChapSim",

  // ----- Dashboard : bannière support -----
  "Besoin d’aide ?": "Need help?",
  "Notre équipe t’assiste en direct sur WhatsApp ou par téléphone.":
    "Our team helps you live on WhatsApp or by phone.",
  Appeler: "Call",

  // ----- Dashboard : carte de consentement -----
  "Engagements d’utilisation confirmés": "Usage commitments confirmed",
  "Vous avez accepté les conditions d’utilisation responsable de ChapCam.":
    "You have accepted ChapCam's responsible use terms.",
  "Revoir mes engagements": "Review my commitments",
  "Utilisation responsable": "Responsible use",
  "Merci de confirmer ces engagements avant d’utiliser ChapCam.":
    "Please confirm these commitments before using ChapCam.",
  "J'utilise uniquement des images pour lesquelles je dispose des droits nécessaires.":
    "I only use images for which I hold the necessary rights.",
  "Je ne vais pas usurper l'identité d'une personne réelle.":
    "I will not impersonate a real person.",
  "Je comprends que les utilisations frauduleuses sont interdites et peuvent entraîner la suspension du compte.":
    "I understand that fraudulent use is prohibited and may result in account suspension.",
  "Impossible d’enregistrer votre confirmation. Réessayez.":
    "Unable to save your confirmation. Please try again.",
  "Enregistrement…": "Saving…",
  "Je confirme": "I confirm",
  Annuler: "Cancel",

  // ----- ChapCam PC : carte d'achat -----
  "Telecharger ChapCam PC": "Download ChapCam PC",
  "Paiement unique securise · cle de licence envoyee par email":
    "Secure one-time payment · license key sent by email",
  "Change uniquement le visage (le corps n'est pas transforme)":
    "Changes only the face (the body is not transformed)",
  "Compatible Windows et MacBook": "Compatible with Windows and MacBook",
  "GPU dedie (PC Gamer) recommande pour de meilleures performances":
    "Dedicated GPU (gaming PC) recommended for better performance",
  "Face swap temps reel sur ton GPU local": "Real-time face swap on your local GPU",
  "Camera virtuelle (WhatsApp, Zoom, Discord, TikTok Live)":
    "Virtual camera (WhatsApp, Zoom, Discord, TikTok Live)",
  "Aucun abonnement, paiement unique": "No subscription, one-time payment",
  "Fonctionne sans internet": "Works without internet",
  "Meme qualite que les meilleurs outils pro": "Same quality as the best pro tools",

  // ----- ChapCam PC : compte a rebours -----
  "Offre de lancement · fin dans": "Launch offer · ends in",
  "50 000 FCFA a vie pendant l'offre, puis 100 000 FCFA":
    "50,000 FCFA for life during the offer, then 100,000 FCFA",

  // ----- ChapCam PC : telechargement (deja client) -----
  "Deja client ?": "Already a customer?",
  "Entre la cle de licence recue par email pour telecharger ChapCam PC.":
    "Enter the license key received by email to download ChapCam PC.",
  Telecharger: "Download",
  "Telecharger pour Windows": "Download for Windows",
  "Telecharger pour MacBook": "Download for MacBook",
  "Licence valide — choisis ta version.": "Valid license — choose your version.",
  "Compatible Windows et MacBook. Cle activable sur 1 ordinateur.":
    "Compatible with Windows and MacBook. Key activatable on 1 computer.",
  "Entre ta cle de licence.": "Enter your license key.",
  "Cle de licence invalide.": "Invalid license key.",
  "Erreur de connexion. Reessaie.": "Connection error. Please try again.",
  "Le lien de telechargement est momentanement indisponible. Reessaie plus tard ou contacte le support sur chapcam.com.":
    "The download link is temporarily unavailable. Try again later or contact support at chapcam.com.",

  // ----- Live Swap : page principale -----
  "Transformez votre apparence en temps réel avec l'IA.":
    "Transform your appearance in real time with AI.",
  Installation: "Installation",
  "Tarif Full HD 1080p": "Full HD 1080p rate",
  "Tarif HD 720p": "HD 720p rate",
  "Source du swap": "Swap source",
  "Ta caméra en direct, ou une vidéo que tu importes.":
    "Your live camera, or a video you import.",
  Caméra: "Camera",
  Vidéo: "Video",
  "Changer de vidéo": "Change video",
  "Importer une vidéo": "Import a video",
  "Retirer la vidéo": "Remove video",
  "MP4 recommandé.": "MP4 recommended.",
  "File d'attente : position": "Queue: position",
  sur: "of",
  "Les serveurs sont très demandés. Ta session démarre dès qu'une place se libère.":
    "Servers are in high demand. Your session starts as soon as a slot frees up.",
  "Caméra réelle": "Real camera",
  "EN DIRECT": "LIVE",
  "Caméra inactive": "Camera off",
  "Couper la caméra": "Turn off camera",
  "Activer la caméra": "Turn on camera",
  "Caméra active": "Camera on",
  "Caméra coupée": "Camera off",
  "Caméra ChapCam": "ChapCam camera",
  "Mode plein écran immersif": "Immersive fullscreen mode",
  "Mode plein écran immersif (façon mobile)": "Immersive fullscreen mode (mobile style)",
  "Plein écran": "Fullscreen",
  "Réduire la caméra": "Shrink camera",
  "Agrandir la caméra": "Enlarge camera",
  Réduire: "Shrink",
  "Agrandir en plein écran": "Expand to fullscreen",
  "Avatar sélectionné": "Selected avatar",
  "Aucun avatar sélectionné": "No avatar selected",
  Ajouter: "Add",
  "Créez votre premier avatar": "Create your first avatar",
  "Mes avatars": "My avatars",
  "Décors, styles, effets et arrière-plans en direct, sans couper la caméra.":
    "Scenes, styles, effects and backgrounds live, without turning off the camera.",
  "Sans watermark": "No watermark",
  "Codec vidéo (avancé)": "Video codec (advanced)",
  Auto: "Auto",
  compatible: "compatible",
  net: "sharp",
  "Prompt personnalisé": "Custom prompt",
  "Ex: dans un manoir gothique éclairé aux bougies, style cinématique...":
    "E.g.: in a candlelit gothic mansion, cinematic style...",
  "Enhance (améliore le prompt)": "Enhance (improve the prompt)",
  Appliquer: "Apply",
  "Démarre le Live Swap pour appliquer des scènes en direct.":
    "Start Live Swap to apply scenes live.",
  "Fonctionnalité VIP": "VIP feature",
  "Débloque les prompts Studio CHAPCAM en direct et le rendu sans watermark avec VIP PRO ou VIP DEBOUT.":
    "Unlock live CHAPCAM Studio prompts and watermark-free rendering with VIP PRO or VIP DEBOUT.",
  "Passer VIP": "Go VIP",
  Résolution: "Resolution",
  "1080p réservé VIP": "1080p VIP only",
  "Choisir la résolution du live swap": "Choose the live swap resolution",
  "Connexion en cours...": "Connecting...",
  "Arrêter le Live Swap": "Stop Live Swap",
  "Démarrer le Live Swap": "Start Live Swap",
  "La transformation commencera en temps réel": "The transformation will start in real time",
  "Arrêter l'enregistrement": "Stop recording",
  "Enregistrer le swap": "Record the swap",
  "Télécharger l'enregistrement": "Download the recording",
  "Supprimer l'enregistrement": "Delete recording",
  Supprimer: "Delete",
  "Réglages du swap": "Swap settings",
  "Qualité de rendu": "Render quality",
  Standard: "Standard",
  "Ultra HD": "Ultra HD",
  Stabilité: "Stability",
  Lissage: "Smoothing",
  "Réduction du bruit": "Noise reduction",
  "Orientation du visage": "Face orientation",
  Gauche: "Left",
  Centre: "Center",
  Droite: "Right",
  "Correction des couleurs": "Color correction",
  "Mode de traitement": "Processing mode",
  "PC Gaming détecté — mode local forcé pour des performances optimales.":
    "Gaming PC detected — local mode forced for optimal performance.",
  "Durée session": "Session duration",
  "Points utilisés": "Points used",

  // ----- Live Swap : overlay plein écran mobile -----
  "Live Swap plein écran": "Live Swap fullscreen",
  Réelle: "Real",
  "Quitter le plein écran": "Exit fullscreen",
  Excellente: "Excellent",
  Correcte: "Good",
  Faible: "Weak",
  Critique: "Critical",
  "min restantes": "min left",
  "Changer d'avatar": "Change avatar",
  Avatar: "Avatar",
  Arrêter: "Stop",
  Réglages: "Settings",
  "Ajouter un avatar": "Add an avatar",
  "Session en direct": "Live session",
  Fluidité: "Smoothness",
  Latence: "Latency",
  "Temps restant": "Time left",
  "Les réglages avancés (qualité, codec, effets) sont disponibles sur la version ordinateur.":
    "Advanced settings (quality, codec, effects) are available on the desktop version.",
}
