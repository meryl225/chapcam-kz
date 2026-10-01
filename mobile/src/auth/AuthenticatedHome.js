import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { supabase } from '../lib/supabase'

const COLORS = { bg: '#071019', surface: '#101c29', line: '#203246', text: '#F4F7FB', muted: '#9AAABD', cyan: '#5DE1FF', lime: '#B7F36B', red: '#FF8F8F' }

function Metric({ label, value, detail }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text>{detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}</View>
}

export function AuthenticatedHome({ user }) {
  const [subscription, setSubscription] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')

  const loadAccount = useCallback(async () => {
    setError('')
    const { data, error: queryError } = await supabase.from('subscriptions').select('plan,status,points,points_remaining,end_date,is_active').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (queryError) setError('Tes données seront disponibles après la synchronisation du compte.')
    setSubscription(data || null)
    setLoading(false)
    setRefreshing(false)
  }, [user.id])

  useEffect(() => { loadAccount() }, [loadAccount])

  async function signOut() { await supabase.auth.signOut() }
  const available = subscription?.points_remaining ?? subscription?.points ?? 0
  const planName = subscription?.plan ? subscription.plan.replace(/[-_]/g, ' ') : 'Aucun forfait actif'
  const expiry = subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} refreshControl={<RefreshControl tintColor={COLORS.cyan} refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAccount() }} />}>
    <View style={styles.header}><View><Text style={styles.kicker}>CHAPCAM / MOBILE</Text><Text style={styles.title}>Ton studio.</Text></View><Pressable accessibilityRole="button" onPress={signOut} style={styles.avatar}><Text style={styles.avatarText}>{(user.email?.[0] || 'C').toUpperCase()}</Text></Pressable></View>
    <Text style={styles.email}>{user.email}</Text>
    <View style={styles.hero}><View style={styles.heroTop}><Text style={styles.heroEyebrow}>LIVE SWAP</Text><View style={styles.liveDot} /><Text style={styles.liveText}>PRÊT</Text></View><Text style={styles.heroTitle}>Transforme ton image.</Text><Text style={styles.heroCopy}>Accède à ton espace de création et retrouve ton solde en temps réel.</Text><Pressable accessibilityRole="button" style={styles.heroButton}><Text style={styles.heroButtonText}>Ouvrir Live Swap</Text><Text style={styles.arrow}>›</Text></Pressable></View>
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Ton compte</Text><Text style={styles.sectionMeta}>{subscription?.is_active ? 'Actif' : 'Synchronisation'}</Text></View>
    {loading ? <View style={styles.loading}><ActivityIndicator color={COLORS.cyan} /><Text style={styles.loadingText}>Synchronisation de ton espace…</Text></View> : <><View style={styles.metrics}><Metric label="Crédits disponibles" value={String(available)} detail="points Live Swap" /><Metric label="Forfait" value={planName} detail={`Jusqu'au ${expiry}`} /></View>{error ? <Text style={styles.error}>{error}</Text> : null}</>}
    <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Accès rapides</Text></View><View style={styles.actions}><Pressable style={styles.action}><Text style={styles.actionIcon}>＋</Text><View><Text style={styles.actionTitle}>Recharger</Text><Text style={styles.actionCopy}>Crédits et minutes</Text></View></Pressable><Pressable style={styles.action}><Text style={styles.actionIcon}>↗</Text><View><Text style={styles.actionTitle}>Mes créations</Text><Text style={styles.actionCopy}>Voir ton historique</Text></View></Pressable></View>
    <Text style={styles.footer}>Les données affichées sont synchronisées avec ton compte ChapCam.</Text>
  </ScrollView>
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: COLORS.bg }, content: { padding: 22, paddingTop: 28, paddingBottom: 44 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, kicker: { color: COLORS.cyan, fontSize: 11, fontWeight: '800', letterSpacing: 2 }, title: { color: COLORS.text, fontSize: 34, fontWeight: '800', letterSpacing: -1 }, email: { color: COLORS.muted, marginTop: 5, fontSize: 14 }, avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.line, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: COLORS.text, fontWeight: '800', fontSize: 16 }, hero: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 21, marginTop: 28, borderWidth: 1, borderColor: COLORS.line }, heroTop: { flexDirection: 'row', alignItems: 'center', gap: 7 }, heroEyebrow: { color: COLORS.cyan, fontWeight: '800', fontSize: 11, letterSpacing: 1.5 }, liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.lime }, liveText: { color: COLORS.lime, fontSize: 10, fontWeight: '800' }, heroTitle: { color: COLORS.text, fontSize: 25, fontWeight: '800', marginTop: 18 }, heroCopy: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 280 }, heroButton: { marginTop: 22, backgroundColor: COLORS.cyan, borderRadius: 13, minHeight: 48, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroButtonText: { color: '#061018', fontWeight: '800', fontSize: 14 }, arrow: { color: '#061018', fontSize: 24 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 29, marginBottom: 12 }, sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800' }, sectionMeta: { color: COLORS.lime, fontSize: 12, fontWeight: '700' }, metrics: { flexDirection: 'row', gap: 10 }, metric: { flex: 1, minHeight: 112, padding: 15, backgroundColor: COLORS.surface, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line }, metricValue: { color: COLORS.text, fontSize: 20, fontWeight: '800' }, metricLabel: { color: COLORS.muted, fontSize: 12, marginTop: 9 }, metricDetail: { color: COLORS.muted, fontSize: 11, marginTop: 4 }, loading: { minHeight: 112, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface, borderRadius: 17 }, loadingText: { color: COLORS.muted, marginTop: 9, fontSize: 13 }, error: { color: COLORS.red, fontSize: 12, marginTop: 10 }, actions: { gap: 10 }, action: { minHeight: 67, backgroundColor: COLORS.surface, borderRadius: 17, borderWidth: 1, borderColor: COLORS.line, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 14 }, actionIcon: { color: COLORS.cyan, fontSize: 25, width: 26, textAlign: 'center' }, actionTitle: { color: COLORS.text, fontWeight: '800', fontSize: 14 }, actionCopy: { color: COLORS.muted, fontSize: 12, marginTop: 3 }, footer: { color: '#617286', textAlign: 'center', fontSize: 11, marginTop: 28, lineHeight: 17 } })
