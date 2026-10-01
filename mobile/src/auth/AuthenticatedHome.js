import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../lib/supabase'

const C = { bg: '#F7F9FD', ink: '#111827', muted: '#788297', line: '#E7EAF2', blue: '#1677FF', violet: '#6945EF', cyan: '#22C7F2', white: '#FFFFFF' }
const tools = [
  { title: 'Live Swap', copy: 'Change de visage en temps réel', image: '/swap/face-transformed.png', live: true },
  { title: 'Genjutsu', copy: 'Anime tes images avec un mouvement naturel', image: '/images/hero/avatars/a2.png' },
  { title: 'Motion Control', copy: 'Anime ta photo en 3D', image: '/swap/poster-motion.png' },
  { title: 'Traduction vidéo', copy: 'Traduis ta vidéo en 180+ langues', image: '/swap/poster-video-translation.png' },
]

function asset(path) { return { uri: `https://chapcam.com${path}` } }

export function AuthenticatedHome({ user }) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadAccount = useCallback(async () => {
    const { data } = await supabase.from('subscriptions').select('plan,status,points,points_remaining,end_date,is_active').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    setSubscription(data || null)
    setLoading(false)
    setRefreshing(false)
  }, [user.id])

  useEffect(() => { loadAccount() }, [loadAccount])
  const available = subscription?.points_remaining ?? subscription?.points ?? 0
  const planName = subscription?.plan ? subscription.plan.replace(/[-_]/g, ' ') : 'Aucun forfait actif'

  return <View style={styles.root}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAccount() }} tintColor={C.blue} />}>
      <View style={styles.topbar}><View style={styles.brandRow}><Image source={asset('/chapcam-mark.png')} style={styles.mark} /><Text style={styles.brand}>ChapCam</Text></View><View style={styles.topActions}><Text style={styles.lang}>FR</Text><Text style={styles.bell}>♧</Text><Pressable accessibilityLabel="Se déconnecter" onPress={() => supabase.auth.signOut()} style={styles.avatar}><Text style={styles.avatarText}>{(user.email?.[0] || 'C').toUpperCase()}</Text></Pressable></View></View>
      <View style={styles.hero}><View style={styles.heroText}><Text style={styles.heroTitle}>Crée sans{`\n`}limites.</Text><Text style={styles.heroCopy}>L’IA au service de ta créativité. Transforme tes images, vidéos et ta voix avec des outils IA professionnels.</Text><Pressable style={styles.primary}><Text style={styles.primaryText}>Commencer maintenant  →</Text></Pressable></View><Image source={asset('/dashboard/hero-avatar.jpg')} style={styles.heroImage} /></View>
      <View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><Text style={styles.searchText}>Rechercher un outil, un effet, une idée...</Text><Text style={styles.filter}>☷</Text></View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Outils IA</Text><Text style={styles.seeAll}>Tout voir  ›</Text></View>
      <View style={styles.grid}>{tools.map((tool) => <Pressable key={tool.title} style={styles.toolCard}><Image source={asset(tool.image)} style={styles.toolImage} /><View style={styles.overlay} /><View style={styles.toolText}><View style={styles.toolTitleRow}>{tool.live ? <Text style={styles.liveBadge}>LIVE</Text> : null}<Text style={styles.toolTitle}>{tool.title}</Text></View><Text style={styles.toolCopy}>{tool.copy}</Text></View><Text style={styles.toolArrow}>›</Text></Pressable>)}</View>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Ton espace</Text><Text style={styles.plan}>{loading ? '...' : planName}</Text></View>
      <View style={styles.account}><View><Text style={styles.accountLabel}>Crédits IA</Text><Text style={styles.accountValue}>{loading ? '—' : `${available} crédits`}</Text></View><View style={styles.progress}><View style={[styles.progressFill, { width: `${Math.min(Number(available) / 10, 100)}%` }]} /></View></View>
    </ScrollView>
    <View style={styles.nav}><NavItem label="Accueil" icon="⌂" active /><NavItem label="Explorer" icon="⌕" /><Pressable accessibilityLabel="Créer" style={styles.create}><Text style={styles.createText}>＋</Text></Pressable><NavItem label="Créations" icon="▣" /><NavItem label="Profil" icon="♙" /></View>
  </View>
}
function NavItem({ label, icon, active }) { return <Pressable style={styles.navItem}><Text style={[styles.navIcon, active && styles.active]}>{icon}</Text><Text style={[styles.navLabel, active && styles.active]}>{label}</Text></Pressable> }

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: C.bg }, screen: { flex: 1 }, content: { padding: 18, paddingTop: 22, paddingBottom: 110 }, topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, mark: { width: 28, height: 28, borderRadius: 9 }, brand: { color: C.ink, fontSize: 18, fontWeight: '800' }, topActions: { flexDirection: 'row', alignItems: 'center', gap: 14 }, lang: { color: C.blue, fontSize: 12, fontWeight: '800' }, bell: { color: C.ink, fontSize: 20 }, avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E1E7F0', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: C.ink, fontWeight: '800' }, hero: { height: 188, borderRadius: 22, overflow: 'hidden', backgroundColor: '#DBE9FF', flexDirection: 'row', marginBottom: 18 }, heroText: { padding: 18, flex: 1, zIndex: 1 }, heroTitle: { color: '#102B68', fontSize: 30, lineHeight: 31, fontWeight: '900' }, heroCopy: { color: '#52627F', fontSize: 10, lineHeight: 14, marginTop: 8, maxWidth: 160 }, primary: { backgroundColor: C.blue, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, marginTop: 12 }, primaryText: { color: C.white, fontWeight: '800', fontSize: 11 }, heroImage: { width: 155, height: 188, resizeMode: 'cover' }, search: { height: 48, backgroundColor: C.white, borderRadius: 14, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9 }, searchIcon: { fontSize: 24, color: C.ink }, searchText: { color: C.muted, fontSize: 12, flex: 1 }, filter: { color: C.ink, fontSize: 20 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 25, marginBottom: 12 }, sectionTitle: { color: C.ink, fontSize: 18, fontWeight: '900' }, seeAll: { color: C.blue, fontSize: 12, fontWeight: '800' }, plan: { color: C.violet, fontSize: 12, fontWeight: '700' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, toolCard: { width: '48.2%', height: 154, borderRadius: 17, overflow: 'hidden', backgroundColor: '#1B2040' }, toolImage: { width: '100%', height: '100%', resizeMode: 'cover' }, overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,18,52,0.28)' }, toolText: { position: 'absolute', left: 12, right: 10, bottom: 12 }, toolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, toolTitle: { color: C.white, fontWeight: '900', fontSize: 14 }, toolCopy: { color: '#F0F2FF', fontSize: 9, lineHeight: 12, marginTop: 3 }, liveBadge: { color: C.white, backgroundColor: '#F23D65', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, fontSize: 8, fontWeight: '900' }, toolArrow: { position: 'absolute', right: 10, bottom: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.white, color: C.violet, textAlign: 'center', fontSize: 20, lineHeight: 19, fontWeight: '800' }, account: { backgroundColor: C.white, borderRadius: 15, padding: 16, borderWidth: 1, borderColor: C.line }, accountLabel: { color: C.muted, fontSize: 12 }, accountValue: { color: C.ink, fontSize: 20, fontWeight: '900', marginTop: 4 }, progress: { height: 8, borderRadius: 4, backgroundColor: '#E8ECF5', marginTop: 14, overflow: 'hidden' }, progressFill: { height: 8, backgroundColor: C.violet, borderRadius: 4 }, nav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 78, backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: 10 }, navItem: { alignItems: 'center', minWidth: 52 }, navIcon: { color: C.muted, fontSize: 22 }, navLabel: { color: C.muted, fontSize: 9, marginTop: 2 }, active: { color: C.blue, fontWeight: '800' }, create: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: -26, shadowColor: C.blue, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 }, createText: { color: C.white, fontSize: 32, fontWeight: '300', marginTop: -3 } })
