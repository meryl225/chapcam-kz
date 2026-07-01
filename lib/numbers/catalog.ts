// Catalogue canonique ChapCam Numbers.
// Chaque service / pays est mappé vers le fournisseur actif (sms-man), résolu
// dynamiquement par nom via `match` (voir lib/numbers/providers/smsman.ts).
// Ce fichier est généré/curé à partir du catalogue live sms-man
// (/applications et /countries) : chaque entrée ci-dessous a été vérifiée
// comme réellement disponible chez le fournisseur.

export type CanonService = {
  slug: string
  label: string
  icon: string // nom lucide (résolu côté UI)
  logo: string // slug theSVG.org pour le vrai logo de marque
  logoVariant?: string // variante theSVG (défaut: 'default'). 'mono' pour les logos monochromes
  match: string[] // mots-clés pour matcher le catalogue sms-man
}

export type CanonCountry = {
  code: string // ISO-2
  name: string
  dial: string
  flag?: string // conservé pour compat; l'UI affiche un vrai drapeau via le code ISO
  match: string[] // mots-clés pour matcher (nom sms-man)
}

// Forfaits proposés. "verification" = SMS unique (activation, fiable).
// La LOCATION (numéro réutilisable, multi-SMS) n'est plus proposée : le seul
// fournisseur actif (sms-man) ne gère que la vérification par SMS unique.
export type RentalPlanKey = 'verification' | 'rent_3d' | 'rent_1w' | 'rent_1m'

export type RentalPlan = {
  key: RentalPlanKey
  label: string
  short: string
  mode: 'verification' | 'rental'
  /** Durée minimale souhaitée (heures). 0 = activation ponctuelle. */
  minHours: number
}

export const RENTAL_PLANS: RentalPlan[] = [
  { key: 'verification', label: 'Vérification (SMS unique)', short: 'Quelques minutes', mode: 'verification', minHours: 0 },
]

export function rentalPlanByKey(key: string): RentalPlan | undefined {
  return RENTAL_PLANS.find((p) => p.key === key)
}

// 116 services vérifiés disponibles chez sms-man.
export const SERVICES: CanonService[] = [
  { slug: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle', logo: 'whatsapp', match: ['whatsapp'] },
  { slug: 'telegram', label: 'Telegram', icon: 'Send', logo: 'telegram', match: ['telegram'] },
  { slug: 'google', label: 'Google / Gmail', icon: 'Mail', logo: 'gmail', match: ['google,youtube', 'google'] },
  { slug: 'facebook', label: 'Facebook', icon: 'Facebook', logo: 'facebook', match: ['facebook'] },
  { slug: 'instagram', label: 'Instagram', icon: 'Instagram', logo: 'instagram', match: ['instagram'] },
  { slug: 'tiktok', label: 'TikTok', icon: 'Music2', logo: 'tiktok', match: ['tiktok'] },
  { slug: 'twitter', label: 'X (Twitter)', icon: 'Twitter', logo: 'x', match: ['twitter'] },
  { slug: 'discord', label: 'Discord', icon: 'MessageSquare', logo: 'discord', match: ['discord'] },
  { slug: 'amazon', label: 'Amazon', icon: 'ShoppingCart', logo: 'amazon', match: ['amazon'] },
  { slug: 'uber', label: 'Uber', icon: 'Car', logo: 'uber', logoVariant: 'mono', match: ['uber'] },
  { slug: 'microsoft', label: 'Microsoft', icon: 'Grid2x2', logo: 'microsoft', match: ['microsoft'] },
  { slug: 'apple', label: 'Apple', icon: 'Apple', logo: 'apple', logoVariant: 'mono', match: ['apple'] },
  { slug: 'netflix', label: 'Netflix', icon: 'Play', logo: 'netflix', match: ['netflix'] },
  { slug: 'tinder', label: 'Tinder', icon: 'Flame', logo: 'tinder', match: ['tinder'] },
  { slug: 'linkedin', label: 'LinkedIn', icon: 'Briefcase', logo: 'linkedin', match: ['linkedin'] },
  { slug: 'yahoo', label: 'Yahoo', icon: 'Mail', logo: 'yahoo', match: ['yahoo'] },
  { slug: 'viber', label: 'Viber', icon: 'Phone', logo: 'viber', match: ['viber'] },
  { slug: 'line', label: 'LINE', icon: 'MessageCircle', logo: 'line', match: ['line messenger'] },
  { slug: 'wechat', label: 'WeChat', icon: 'MessageCircle', logo: 'wechat', match: ['wechat'] },
  { slug: 'vk', label: 'VKontakte', icon: 'Users', logo: 'vk', match: ['vkontakte'] },
  { slug: 'snapchat', label: 'Snapchat', icon: 'Camera', logo: 'snapchat', match: ['snapchat'] },
  { slug: 'signal', label: 'Signal', icon: 'MessageSquare', logo: 'signal', match: ['signal'] },
  { slug: 'steam', label: 'Steam', icon: 'Gamepad2', logo: 'steam', match: ['steam'] },
  { slug: 'revolut', label: 'Revolut', icon: 'CreditCard', logo: 'revolut', match: ['revolut'] },
  { slug: 'binance', label: 'Binance', icon: 'Bitcoin', logo: 'binance', match: ['binance'] },
  { slug: 'coinbase', label: 'Coinbase', icon: 'Bitcoin', logo: 'coinbase', match: ['coinbase'] },
  { slug: 'bybit', label: 'Bybit', icon: 'Bitcoin', logo: 'bybit', match: ['bybit'] },
  { slug: 'kraken', label: 'Kraken', icon: 'Bitcoin', logo: 'kraken', match: ['kraken'] },
  { slug: 'okx', label: 'OKX', icon: 'Bitcoin', logo: 'okx', match: ['okx'] },
  { slug: 'kucoin', label: 'KuCoin', icon: 'Bitcoin', logo: 'kucoin', match: ['kucoin'] },
  { slug: 'bitget', label: 'Bitget', icon: 'Bitcoin', logo: 'bitget', match: ['bitget'] },
  { slug: 'mexc', label: 'MEXC', icon: 'Bitcoin', logo: 'mexc', match: ['mexc'] },
  { slug: 'gateio', label: 'Gate.io', icon: 'Bitcoin', logo: 'gate', match: ['gate.io'] },
  { slug: 'gemini', label: 'Gemini', icon: 'Bitcoin', logo: 'gemini', match: ['gemini.com'] },
  { slug: 'luno', label: 'Luno', icon: 'Bitcoin', logo: 'luno', match: ['luno'] },
  { slug: 'bolt', label: 'Bolt', icon: 'Car', logo: 'bolt', match: ['bolt'] },
  { slug: 'airbnb', label: 'Airbnb', icon: 'Hotel', logo: 'airbnb', match: ['airbnb'] },
  { slug: 'booking', label: 'Booking.com', icon: 'Hotel', logo: 'bookingcom', match: ['booking.com'] },
  { slug: 'aliexpress', label: 'AliExpress', icon: 'ShoppingBag', logo: 'aliexpress', match: ['aliexpress'] },
  { slug: 'alibaba', label: 'Alibaba', icon: 'ShoppingBag', logo: 'alibaba', match: ['alibaba'] },
  { slug: 'ebay', label: 'eBay', icon: 'ShoppingBag', logo: 'ebay', match: ['ebay'] },
  { slug: 'spotify', label: 'Spotify', icon: 'Music', logo: 'spotify', match: ['spotify'] },
  { slug: 'twitch', label: 'Twitch', icon: 'Video', logo: 'twitch', match: ['twitch'] },
  { slug: 'openai', label: 'OpenAI / ChatGPT', icon: 'Bot', logo: 'openai', logoVariant: 'mono', match: ['openai'] },
  { slug: 'claude', label: 'Claude', icon: 'Bot', logo: 'anthropic', logoVariant: 'mono', match: ['claudeai'] },
  { slug: 'grindr', label: 'Grindr', icon: 'Heart', logo: 'grindr', match: ['grindr'] },
  { slug: 'bumble', label: 'Bumble', icon: 'Heart', logo: 'bumble', match: ['bumble'] },
  { slug: 'badoo', label: 'Badoo', icon: 'Heart', logo: 'badoo', match: ['badoo'] },
  { slug: 'olx', label: 'OLX', icon: 'Store', logo: 'olx', match: ['olx'] },
  { slug: 'yandex', label: 'Yandex', icon: 'Globe', logo: 'yandex', match: ['yandex'] },
  { slug: 'mailru', label: 'Mail.ru', icon: 'Mail', logo: 'mailru', match: ['mailru group'] },
  { slug: 'proton', label: 'Proton Mail', icon: 'Mail', logo: 'proton', match: ['protonmail'] },
  { slug: 'tumblr', label: 'Tumblr', icon: 'Globe', logo: 'tumblr', match: ['tumblr'] },
  { slug: 'reddit', label: 'Reddit', icon: 'MessageSquare', logo: 'reddit', match: ['reddit'] },
  { slug: 'pinterest', label: 'Pinterest', icon: 'Image', logo: 'pinterest', match: ['pinterest'] },
  { slug: 'skype', label: 'Skype', icon: 'Video', logo: 'skype', match: ['skype'] },
  { slug: 'grab', label: 'Grab', icon: 'Car', logo: 'grab', match: ['grab'] },
  { slug: 'gojek', label: 'Gojek', icon: 'Bike', logo: 'gojek', match: ['gojek'] },
  { slug: 'careem', label: 'Careem', icon: 'Car', logo: 'careem', match: ['careem'] },
  { slug: 'deliveroo', label: 'Deliveroo', icon: 'Utensils', logo: 'deliveroo', match: ['deliveroo'] },
  { slug: 'glovo', label: 'Glovo', icon: 'Utensils', logo: 'glovo', match: ['glovo'] },
  { slug: 'wolt', label: 'Wolt', icon: 'Utensils', logo: 'wolt', match: ['wolt'] },
  { slug: 'doordash', label: 'DoorDash', icon: 'Utensils', logo: 'doordash', match: ['doordash'] },
  { slug: 'lyft', label: 'Lyft', icon: 'Car', logo: 'lyft', match: ['lyft'] },
  { slug: 'indrive', label: 'inDrive', icon: 'Car', logo: 'indrive', match: ['indriver'] },
  { slug: 'yalla', label: 'Yalla', icon: 'Radio', logo: 'yalla', match: ['yalla'] },
  { slug: 'kakaotalk', label: 'KakaoTalk', icon: 'MessageCircle', logo: 'kakaotalk', match: ['kakaotalk'] },
  { slug: 'naver', label: 'Naver', icon: 'Globe', logo: 'naver', match: ['naver'] },
  { slug: 'nike', label: 'Nike', icon: 'ShoppingBag', logo: 'nike', logoVariant: 'mono', match: ['nike'] },
  { slug: 'shopee', label: 'Shopee', icon: 'ShoppingBag', logo: 'shopee', match: ['shopee'] },
  { slug: 'lazada', label: 'Lazada', icon: 'ShoppingBag', logo: 'lazada', match: ['lazada'] },
  { slug: 'fiverr', label: 'Fiverr', icon: 'Briefcase', logo: 'fiverr', match: ['fiverr'] },
  { slug: 'upwork', label: 'Upwork', icon: 'Briefcase', logo: 'upwork', match: ['upwork'] },
  { slug: 'truecaller', label: 'Truecaller', icon: 'Phone', logo: 'truecaller', match: ['truecaller'] },
  { slug: 'clubhouse', label: 'Clubhouse', icon: 'Radio', logo: 'clubhouse', match: ['clubhouse'] },
  { slug: 'threads', label: 'Threads', icon: 'Instagram', logo: 'threads', logoVariant: 'mono', match: ['threads'] },
  { slug: 'temu', label: 'Temu', icon: 'ShoppingBag', logo: 'temu', match: ['temu'] },
  { slug: 'shein', label: 'Shein', icon: 'ShoppingBag', logo: 'shein', match: ['shein'] },
  { slug: 'depop', label: 'Depop', icon: 'ShoppingBag', logo: 'depop', match: ['depop'] },
  { slug: 'vinted', label: 'Vinted', icon: 'ShoppingBag', logo: 'vinted', match: ['vinted'] },
  { slug: 'etsy', label: 'Etsy', icon: 'ShoppingBag', logo: 'etsy', match: ['etsy'] },
  { slug: 'walmart', label: 'Walmart', icon: 'ShoppingCart', logo: 'walmart', match: ['walmart'] },
  { slug: 'target', label: 'Target', icon: 'ShoppingCart', logo: 'target', match: ['target'] },
  { slug: 'instacart', label: 'Instacart', icon: 'ShoppingCart', logo: 'instacart', match: ['instacart'] },
  { slug: 'weibo', label: 'Weibo', icon: 'Globe', logo: 'weibo', match: ['weibo'] },
  { slug: 'qq', label: 'Tencent QQ', icon: 'MessageCircle', logo: 'tencentqq', match: ['tencent qq'] },
  { slug: 'baidu', label: 'Baidu', icon: 'Globe', logo: 'baidu', match: ['baidu'] },
  { slug: 'dropbox', label: 'Dropbox', icon: 'Package', logo: 'dropbox', match: ['dropbox'] },
  { slug: 'gitlab', label: 'GitLab', icon: 'Grid2x2', logo: 'gitlab', match: ['gitlab'] },
  { slug: 'hinge', label: 'Hinge', icon: 'Heart', logo: 'hinge', match: ['hinge'] },
  { slug: 'okcupid', label: 'OkCupid', icon: 'Heart', logo: 'okcupid', match: ['okcupid'] },
  { slug: 'tagged', label: 'Tagged', icon: 'Heart', logo: 'tagged', match: ['tagged'] },
  { slug: 'pof', label: 'Plenty of Fish', icon: 'Heart', logo: 'pof', match: ['plenty of fish'] },
  { slug: 'phonepe', label: 'PhonePe', icon: 'Wallet', logo: 'phonepe', match: ['phonepe'] },
  { slug: 'flutterwave', label: 'Flutterwave', icon: 'Wallet', logo: 'flutterwave', match: ['flutterwave'] },
  { slug: 'wildberries', label: 'Wildberries', icon: 'ShoppingBag', logo: 'wildberries', match: ['wildberries'] },
  { slug: 'ozon', label: 'OZON', icon: 'ShoppingBag', logo: 'ozon', match: ['ozon'] },
  { slug: 'foodpanda', label: 'Foodpanda', icon: 'Utensils', logo: 'foodpanda', match: ['foodpanda'] },
  { slug: 'talabat', label: 'Talabat', icon: 'Utensils', logo: 'talabat', match: ['talabat'] },
  { slug: 'blablacar', label: 'BlaBlaCar', icon: 'Car', logo: 'blablacar', match: ['blablacar'] },
  { slug: 'getir', label: 'Getir', icon: 'Bike', logo: 'getir', match: ['getir'] },
  { slug: 'taobao', label: 'Taobao', icon: 'ShoppingBag', logo: 'taobao', match: ['taobao'] },
  { slug: 'zalo', label: 'Zalo', icon: 'MessageCircle', logo: 'zalo', match: ['zalo'] },
  { slug: 'tantan', label: 'Tantan', icon: 'Heart', logo: 'tantan', match: ['tantan'] },
  { slug: 'imo', label: 'imo', icon: 'Video', logo: 'imo', match: ['imo'] },
  { slug: 'skrill', label: 'Skrill', icon: 'Wallet', logo: 'skrill', match: ['skrill'] },
  { slug: 'neteller', label: 'Neteller', icon: 'Wallet', logo: 'neteller', match: ['neteller'] },
  { slug: 'betway', label: 'Betway', icon: 'Dice5', logo: 'betway', match: ['betway'] },
  { slug: 'melbet', label: 'Melbet', icon: 'Dice5', logo: 'melbet', match: ['melbet'] },
  { slug: 'bigo', label: 'BIGO LIVE', icon: 'Video', logo: 'bigolive', match: ['bigo live'] },
  { slug: 'likee', label: 'Likee', icon: 'Video', logo: 'likee', match: ['likee'] },
  { slug: 'kwai', label: 'Kwai', icon: 'Video', logo: 'kwai', match: ['kwai'] },
  { slug: 'happn', label: 'Happn', icon: 'Heart', logo: 'happn', match: ['happn'] },
  { slug: 'yubo', label: 'Yubo', icon: 'Users', logo: 'yubo', match: ['yubo'] },
  { slug: 'meetup', label: 'Meetup', icon: 'Users', logo: 'meetup', match: ['meetup'] },
  { slug: 'hily', label: 'Hily', icon: 'Heart', logo: 'hily', match: ['hily'] },
]

// 130 pays vérifiés disponibles chez sms-man.
export const COUNTRIES: CanonCountry[] = [
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫', match: ['afghanistan'] },
  { code: 'ZA', name: 'Afrique du Sud', dial: '+27', flag: '🇿🇦', match: ['south africa'] },
  { code: 'DZ', name: 'Algérie', dial: '+213', flag: '🇩🇿', match: ['algeria'] },
  { code: 'DE', name: 'Allemagne', dial: '+49', flag: '🇩🇪', match: ['germany'] },
  { code: 'AO', name: 'Angola', dial: '+244', flag: '🇦🇴', match: ['angola'] },
  { code: 'SA', name: 'Arabie saoudite', dial: '+966', flag: '🇸🇦', match: ['saudi arabia'] },
  { code: 'AR', name: 'Argentine', dial: '+54', flag: '🇦🇷', match: ['argentina'] },
  { code: 'AM', name: 'Arménie', dial: '+374', flag: '🇦🇲', match: ['armenia'] },
  { code: 'AU', name: 'Australie', dial: '+61', flag: '🇦🇺', match: ['australia'] },
  { code: 'AT', name: 'Autriche', dial: '+43', flag: '🇦🇹', match: ['austria'] },
  { code: 'AZ', name: 'Azerbaïdjan', dial: '+994', flag: '🇦🇿', match: ['azerbaijan'] },
  { code: 'BH', name: 'Bahreïn', dial: '+973', flag: '🇧🇭', match: ['bahrain'] },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩', match: ['bangladesh'] },
  { code: 'BE', name: 'Belgique', dial: '+32', flag: '🇧🇪', match: ['belgium'] },
  { code: 'BJ', name: 'Bénin', dial: '+229', flag: '🇧🇯', match: ['benin'] },
  { code: 'BO', name: 'Bolivie', dial: '+591', flag: '🇧🇴', match: ['bolivia'] },
  { code: 'BW', name: 'Botswana', dial: '+267', flag: '🇧🇼', match: ['botswana'] },
  { code: 'BR', name: 'Brésil', dial: '+55', flag: '🇧🇷', match: ['brazil'] },
  { code: 'BG', name: 'Bulgarie', dial: '+359', flag: '🇧🇬', match: ['bulgaria'] },
  { code: 'BF', name: 'Burkina Faso', dial: '+226', flag: '🇧🇫', match: ['burkina faso'] },
  { code: 'KH', name: 'Cambodge', dial: '+855', flag: '🇰🇭', match: ['cambodia'] },
  { code: 'CM', name: 'Cameroun', dial: '+237', flag: '🇨🇲', match: ['cameroon'] },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦', match: ['canada'] },
  { code: 'CV', name: 'Cap-Vert', dial: '+238', flag: '🇨🇻', match: ['cabo verde'] },
  { code: 'CF', name: 'Centrafrique', dial: '+236', flag: '🇨🇫', match: ['central african republic'] },
  { code: 'CL', name: 'Chili', dial: '+56', flag: '🇨🇱', match: ['chile'] },
  { code: 'CN', name: 'Chine', dial: '+86', flag: '🇨🇳', match: ['china'] },
  { code: 'CO', name: 'Colombie', dial: '+57', flag: '🇨🇴', match: ['colombia'] },
  { code: 'CG', name: 'Congo', dial: '+242', flag: '🇨🇬', match: ['congo'] },
  { code: 'CI', name: 'Côte d\'Ivoire', dial: '+225', flag: '🇨🇮', match: ['cote d\'ivoire'] },
  { code: 'HR', name: 'Croatie', dial: '+385', flag: '🇭🇷', match: ['croatia'] },
  { code: 'DK', name: 'Danemark', dial: '+45', flag: '🇩🇰', match: ['denmark'] },
  { code: 'EG', name: 'Égypte', dial: '+20', flag: '🇪🇬', match: ['egypt'] },
  { code: 'AE', name: 'Émirats arabes unis', dial: '+971', flag: '🇦🇪', match: ['united arab emirates'] },
  { code: 'EC', name: 'Équateur', dial: '+593', flag: '🇪🇨', match: ['ecuador'] },
  { code: 'ES', name: 'Espagne', dial: '+34', flag: '🇪🇸', match: ['spain'] },
  { code: 'EE', name: 'Estonie', dial: '+372', flag: '🇪🇪', match: ['estonia'] },
  { code: 'US', name: 'États-Unis', dial: '+1', flag: '🇺🇸', match: ['usa'] },
  { code: 'ET', name: 'Éthiopie', dial: '+251', flag: '🇪🇹', match: ['ethiopia'] },
  { code: 'FI', name: 'Finlande', dial: '+358', flag: '🇫🇮', match: ['finland'] },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷', match: ['france'] },
  { code: 'GA', name: 'Gabon', dial: '+241', flag: '🇬🇦', match: ['gabon'] },
  { code: 'GM', name: 'Gambie', dial: '+220', flag: '🇬🇲', match: ['gambia'] },
  { code: 'GE', name: 'Géorgie', dial: '+995', flag: '🇬🇪', match: ['georgia'] },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭', match: ['ghana'] },
  { code: 'GR', name: 'Grèce', dial: '+30', flag: '🇬🇷', match: ['greece'] },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹', match: ['guatemala'] },
  { code: 'GN', name: 'Guinée', dial: '+224', flag: '🇬🇳', match: ['guinea'] },
  { code: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰', match: ['hong kong'] },
  { code: 'HU', name: 'Hongrie', dial: '+36', flag: '🇭🇺', match: ['hungary'] },
  { code: 'IN', name: 'Inde', dial: '+91', flag: '🇮🇳', match: ['india'] },
  { code: 'ID', name: 'Indonésie', dial: '+62', flag: '🇮🇩', match: ['indonesia'] },
  { code: 'IQ', name: 'Irak', dial: '+964', flag: '🇮🇶', match: ['iraq'] },
  { code: 'IR', name: 'Iran', dial: '+98', flag: '🇮🇷', match: ['iran'] },
  { code: 'IE', name: 'Irlande', dial: '+353', flag: '🇮🇪', match: ['ireland'] },
  { code: 'IL', name: 'Israël', dial: '+972', flag: '🇮🇱', match: ['israel'] },
  { code: 'IT', name: 'Italie', dial: '+39', flag: '🇮🇹', match: ['italy'] },
  { code: 'JP', name: 'Japon', dial: '+81', flag: '🇯🇵', match: ['japan'] },
  { code: 'JO', name: 'Jordanie', dial: '+962', flag: '🇯🇴', match: ['jordan'] },
  { code: 'KZ', name: 'Kazakhstan', dial: '+7', flag: '🇰🇿', match: ['kazakhstan'] },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪', match: ['kenya'] },
  { code: 'KG', name: 'Kirghizistan', dial: '+996', flag: '🇰🇬', match: ['kyrgyzstan'] },
  { code: 'KW', name: 'Koweït', dial: '+965', flag: '🇰🇼', match: ['kuwait'] },
  { code: 'LA', name: 'Laos', dial: '+856', flag: '🇱🇦', match: ['laos'] },
  { code: 'LV', name: 'Lettonie', dial: '+371', flag: '🇱🇻', match: ['latvia'] },
  { code: 'LB', name: 'Liban', dial: '+961', flag: '🇱🇧', match: ['lebanon'] },
  { code: 'LR', name: 'Liberia', dial: '+231', flag: '🇱🇷', match: ['liberia'] },
  { code: 'LY', name: 'Libye', dial: '+218', flag: '🇱🇾', match: ['libya'] },
  { code: 'LT', name: 'Lituanie', dial: '+370', flag: '🇱🇹', match: ['lithuania'] },
  { code: 'MO', name: 'Macao', dial: '+853', flag: '🇲🇴', match: ['macao'] },
  { code: 'MG', name: 'Madagascar', dial: '+261', flag: '🇲🇬', match: ['madagascar'] },
  { code: 'MY', name: 'Malaisie', dial: '+60', flag: '🇲🇾', match: ['malaysia'] },
  { code: 'MW', name: 'Malawi', dial: '+265', flag: '🇲🇼', match: ['malawi'] },
  { code: 'ML', name: 'Mali', dial: '+223', flag: '🇲🇱', match: ['mali'] },
  { code: 'MA', name: 'Maroc', dial: '+212', flag: '🇲🇦', match: ['morocco'] },
  { code: 'MU', name: 'Maurice', dial: '+230', flag: '🇲🇺', match: ['mauritius'] },
  { code: 'MR', name: 'Mauritanie', dial: '+222', flag: '🇲🇷', match: ['mauritania'] },
  { code: 'MX', name: 'Mexique', dial: '+52', flag: '🇲🇽', match: ['mexico'] },
  { code: 'MD', name: 'Moldavie', dial: '+373', flag: '🇲🇩', match: ['moldova'] },
  { code: 'MN', name: 'Mongolie', dial: '+976', flag: '🇲🇳', match: ['mongolia'] },
  { code: 'MZ', name: 'Mozambique', dial: '+258', flag: '🇲🇿', match: ['mozambique'] },
  { code: 'MM', name: 'Myanmar', dial: '+95', flag: '🇲🇲', match: ['myanmar'] },
  { code: 'NA', name: 'Namibie', dial: '+264', flag: '🇳🇦', match: ['namibia'] },
  { code: 'NP', name: 'Népal', dial: '+977', flag: '🇳🇵', match: ['nepal'] },
  { code: 'NE', name: 'Niger', dial: '+227', flag: '🇳🇪', match: ['niger'] },
  { code: 'NG', name: 'Nigéria', dial: '+234', flag: '🇳🇬', match: ['nigeria'] },
  { code: 'NO', name: 'Norvège', dial: '+47', flag: '🇳🇴', match: ['norway'] },
  { code: 'NZ', name: 'Nouvelle-Zélande', dial: '+64', flag: '🇳🇿', match: ['new zealand'] },
  { code: 'OM', name: 'Oman', dial: '+968', flag: '🇴🇲', match: ['oman'] },
  { code: 'UG', name: 'Ouganda', dial: '+256', flag: '🇺🇬', match: ['uganda'] },
  { code: 'UZ', name: 'Ouzbékistan', dial: '+998', flag: '🇺🇿', match: ['uzbekistan'] },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰', match: ['pakistan'] },
  { code: 'PS', name: 'Palestine', dial: '+970', flag: '🇵🇸', match: ['palestine'] },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾', match: ['paraguay'] },
  { code: 'NL', name: 'Pays-Bas', dial: '+31', flag: '🇳🇱', match: ['netherlands'] },
  { code: 'PE', name: 'Pérou', dial: '+51', flag: '🇵🇪', match: ['peru'] },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭', match: ['philippines'] },
  { code: 'PL', name: 'Pologne', dial: '+48', flag: '🇵🇱', match: ['poland'] },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹', match: ['portugal'] },
  { code: 'QA', name: 'Qatar', dial: '+974', flag: '🇶🇦', match: ['qatar'] },
  { code: 'CD', name: 'RD Congo', dial: '+243', flag: '🇨🇩', match: ['dr congo'] },
  { code: 'DO', name: 'République dominicaine', dial: '+1', flag: '🇩🇴', match: ['dominican republic'] },
  { code: 'RO', name: 'Roumanie', dial: '+40', flag: '🇷🇴', match: ['romania'] },
  { code: 'GB', name: 'Royaume-Uni', dial: '+44', flag: '🇬🇧', match: ['united kingdom/england'] },
  { code: 'RW', name: 'Rwanda', dial: '+250', flag: '🇷🇼', match: ['rwanda'] },
  { code: 'SN', name: 'Sénégal', dial: '+221', flag: '🇸🇳', match: ['senegal'] },
  { code: 'RS', name: 'Serbie', dial: '+381', flag: '🇷🇸', match: ['serbia'] },
  { code: 'SL', name: 'Sierra Leone', dial: '+232', flag: '🇸🇱', match: ['sierra leone'] },
  { code: 'SG', name: 'Singapour', dial: '+65', flag: '🇸🇬', match: ['singapore'] },
  { code: 'SO', name: 'Somalie', dial: '+252', flag: '🇸🇴', match: ['somalia'] },
  { code: 'SD', name: 'Soudan', dial: '+249', flag: '🇸🇩', match: ['sudan'] },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰', match: ['sri lanka'] },
  { code: 'SE', name: 'Suède', dial: '+46', flag: '🇸🇪', match: ['sweden'] },
  { code: 'CH', name: 'Suisse', dial: '+41', flag: '🇨🇭', match: ['switzerland'] },
  { code: 'TJ', name: 'Tadjikistan', dial: '+992', flag: '🇹🇯', match: ['tajikistan'] },
  { code: 'TW', name: 'Taïwan', dial: '+886', flag: '🇹🇼', match: ['taiwan, province of china'] },
  { code: 'TZ', name: 'Tanzanie', dial: '+255', flag: '🇹🇿', match: ['tanzania'] },
  { code: 'TD', name: 'Tchad', dial: '+235', flag: '🇹🇩', match: ['chad'] },
  { code: 'CZ', name: 'Tchéquie', dial: '+420', flag: '🇨🇿', match: ['czechia'] },
  { code: 'TH', name: 'Thaïlande', dial: '+66', flag: '🇹🇭', match: ['thailand'] },
  { code: 'TG', name: 'Togo', dial: '+228', flag: '🇹🇬', match: ['togo'] },
  { code: 'TN', name: 'Tunisie', dial: '+216', flag: '🇹🇳', match: ['tunisia'] },
  { code: 'TM', name: 'Turkménistan', dial: '+993', flag: '🇹🇲', match: ['turkmenistan'] },
  { code: 'TR', name: 'Turquie', dial: '+90', flag: '🇹🇷', match: ['turkey'] },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾', match: ['uruguay'] },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪', match: ['venezuela'] },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳', match: ['vietnam'] },
  { code: 'YE', name: 'Yémen', dial: '+967', flag: '🇾🇪', match: ['yemen'] },
  { code: 'ZM', name: 'Zambie', dial: '+260', flag: '🇿🇲', match: ['zambia'] },
  { code: 'ZW', name: 'Zimbabwe', dial: '+263', flag: '🇿🇼', match: ['zimbabwe'] },
]

export const serviceBySlug = (slug: string) => SERVICES.find((s) => s.slug === slug)
export const countryByCode = (code: string) => COUNTRIES.find((c) => c.code === code)

export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}
