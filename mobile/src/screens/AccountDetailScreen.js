import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { C, PAD } from '../ui/catalog'
import { useJetonsBalance } from '../lib/useJetonsBalance'
import { fetchActivity } from '../lib/activity'

const NAVY = '#0B1230'
const BG = '#F5F7FF'
const MUTED = '#68718D'

const CONFIG = {
  activity: { title: 'Activité récente', icon: 'pulse-outline', intro: 'Retrouve ici les dernières utilisations de ChapCam.' },
  purchases: { title: 'Achats et factures', icon: 'receipt-outline', intro: 'Consulte tes achats et retrouve tes justificatifs.' },
  subscription: { title: 'Gestion de l’abonnement', icon: 'diamond-outline', intro: 'Gère ton forfait Live Swap et ses avantages.' },
}

export function AccountDetailScreen({ type, onBack, subscription, jetons }) {
  const config = CONFIG[type] || CONFIG.activity
  const insets = useSafeAreaInsets()
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour au profil" onPress={onBack} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={NAVY} />
        </Pressable>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name={config.icon} size={25} color={C.blue} /></View>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.intro}>{config.intro}</Text>
        </View>
        {type === 'activity' ? <Activity /> : null}
        {type === 'purchases' ? <Purchases subscription={subscription} jetons={jetons} /> : null}
        {type === 'subscription' ? <Subscription subscription={subscription} /> : null}
      </ScrollView>
    </View>
  )
}

const AMOUNT_COLORS = { usage: NAVY, refund: '#15734C', credit: '#15734C' }

function dayLabel(date) {
  const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOf(new Date()) - startOf(date)) / 86400000)
  if (diff === 0) return 'Aujourd’hui'
  if (diff === 1) return 'Hier'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })
}

function groupByDay(items) {
  const groups = []
  for (const item of items) {
    const date = new Date(item.createdAt)
    const label = dayLabel(date)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.items.push(item)
    else groups.push({ label, items: [item] })
  }
  return groups
}

function formatJetons(value) {
  return Math.abs(Number(value) || 0).toLocaleString('fr-FR')
}

function Activity() {
  const [state, setState] = useState({ status: 'loading', items: [] })

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'loading' }))
    fetchActivity()
      .then((items) => setState({ status: 'ready', items }))
      .catch((error) => setState({ status: error?.message === 'session' ? 'session' : 'error', items: [] }))
  }, [])

  useEffect(() => { load() }, [load])

  if (state.status === 'loading' && state.items.length === 0) {
    return <View style={styles.activityState}><ActivityIndicator color={C.blue} /><Text style={styles.activityStateText}>Chargement de l’activité…</Text></View>
  }
  if (state.status === 'error' || state.status === 'session') {
    return <View style={styles.activityState}>
      <Text style={styles.activityStateTitle}>Activité indisponible</Text>
      <Text style={styles.activityStateText}>{state.status === 'session' ? 'Session expirée. Reconnecte-toi pour voir ton activité.' : 'Vérifie ta connexion puis réessaie.'}</Text>
      {state.status === 'error' ? <Pressable accessibilityRole="button" onPress={load} style={styles.retry}><Text style={styles.retryText}>Réessayer</Text></Pressable> : null}
    </View>
  }
  if (state.items.length === 0) return <ActivityEmpty />

  const spent = state.items.filter((i) => i.type === 'usage').reduce((sum, i) => sum + Math.abs(i.amount), 0)
  const added = state.items.filter((i) => i.type !== 'usage').reduce((sum, i) => sum + i.amount, 0)

  return <>
    <View style={styles.totals}>
      <View style={styles.total}><Text style={styles.totalLabel}>Utilisés</Text><Text style={styles.totalValue}>{formatJetons(spent)}</Text></View>
      <View style={styles.totalDivider} />
      <View style={styles.total}><Text style={styles.totalLabel}>Ajoutés / remboursés</Text><Text style={[styles.totalValue, { color: AMOUNT_COLORS.credit }]}>{formatJetons(added)}</Text></View>
    </View>
    {groupByDay(state.items).map((group) => (
      <View key={group.label} style={styles.dayGroup}>
        <Text style={styles.dayLabel}>{group.label}</Text>
        <View style={styles.card}>
          {group.items.map((item, index) => {
            const time = new Date(item.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            const sign = item.amount < 0 ? '−' : '+'
            return (
              <View key={item.id} style={[styles.activityRow, index === group.items.length - 1 && styles.activityRowLast]} accessible accessibilityLabel={`${item.title}, ${sign}${formatJetons(item.amount)} Jetons, ${time}`}>
                <View style={styles.activityMain}>
                  <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.activityMeta} numberOfLines={1}>{item.detail ? `${time} · ${item.detail}` : time}</Text>
                </View>
                <View style={styles.activityAmounts}>
                  <Text style={[styles.activityAmount, { color: AMOUNT_COLORS[item.type] || NAVY }]}>{`${sign}${formatJetons(item.amount)}`}</Text>
                  <Text style={styles.activityBalance}>{`Solde ${formatJetons(item.balanceAfter)}`}</Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>
    ))}
    <Text style={styles.note}>Montants en Jetons. Les 50 derniers mouvements sont affichés.</Text>
  </>
}

function ActivityEmpty() {
  return <View style={styles.empty}><Ionicons name="sparkles-outline" size={30} color={C.violet} /><Text style={styles.emptyTitle}>Ton activité apparaîtra ici</Text><Text style={styles.emptyText}>Tes créations et consommations seront regroupées dans un historique simple à consulter.</Text></View>
}

function Purchases({ subscription }) {
  const { jetons } = useJetonsBalance()
  const plan = subscription?.plan || 'Aucun forfait actif'
  return <>
    <View style={styles.card}><Row icon="diamond-outline" label="Abonnement" value={plan} /><Row icon="wallet-outline" label="Solde actuel" value={`${jetons == null ? '—' : Number(jetons).toLocaleString('fr-FR')}${jetons == null ? '' : ' Jetons'}`} /><Row icon="calendar-outline" label="Prochain renouvellement" value={subscription?.expires_at || subscription?.end_date ? new Date(subscription.expires_at || subscription.end_date).toLocaleDateString('fr-FR') : '—'} /></View>
    <Text style={styles.note}>Les factures détaillées seront disponibles ici après chaque achat.</Text>
  </>
}

function Subscription({ subscription }) {
  const plan = subscription?.plan || 'Aucun forfait actif'
  const date = subscription?.expires_at || subscription?.end_date
  return <>
    <View style={styles.planCard}><Text style={styles.planEyebrow}>FORFAIT ACTUEL</Text><Text style={styles.planName}>{plan}</Text><Text style={styles.planStatus}>{subscription?.is_active === false ? 'Inactif' : 'Actif'}</Text>{date ? <Text style={styles.planDate}>Valable jusqu’au {new Date(date).toLocaleDateString('fr-FR')}</Text> : null}</View>
    <View style={styles.card}><Row icon="checkmark-circle-outline" label="Live Swap inclus" value="Selon ton forfait" /><Row icon="shield-checkmark-outline" label="Paiement sécurisé" value="Géré par ChapCam" /></View>
    <Text style={styles.note}>Pour modifier ton forfait ou annuler un renouvellement, contacte le support ChapCam.</Text>
  </>
}

function Row({ icon, label, value }) { return <View style={styles.row}><View style={styles.rowIcon}><Ionicons name={icon} size={19} color={C.blue} /></View><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View> }

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: BG },
  activityState: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 10 },
  activityStateTitle: { color: NAVY, fontSize: 17, fontWeight: '800' },
  activityStateText: { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retry: { marginTop: 4, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: '#E8EDFF' },
  retryText: { color: C.blue, fontSize: 14, fontWeight: '800' },
  totals: { backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 16, flexDirection: 'row', alignItems: 'center' },
  total: { flex: 1, alignItems: 'center', gap: 4 },
  totalDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: '#E3E7F2' },
  totalLabel: { color: MUTED, fontSize: 12, fontWeight: '700' },
  totalValue: { color: NAVY, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  dayGroup: { gap: 8 },
  dayLabel: { color: MUTED, fontSize: 13, fontWeight: '800', paddingHorizontal: 4, textTransform: 'capitalize' },
  activityRow: { minHeight: 62, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3E7F2' },
  activityRowLast: { borderBottomWidth: 0 },
  activityMain: { flex: 1, gap: 3 },
  activityTitle: { color: NAVY, fontSize: 15, fontWeight: '700' },
  activityMeta: { color: MUTED, fontSize: 13 },
  activityAmounts: { alignItems: 'flex-end', gap: 3 },
  activityAmount: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  activityBalance: { color: MUTED, fontSize: 12, fontVariant: ['tabular-nums'] }, header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, backgroundColor: BG }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8EDFF', alignItems: 'center', justifyContent: 'center' }, headerTitle: { flex: 1, textAlign: 'center', color: NAVY, fontSize: 17, fontWeight: '800' }, headerSpacer: { width: 42 }, content: { padding: PAD, paddingBottom: 40, gap: 16 }, hero: { backgroundColor: NAVY, borderRadius: 24, padding: 22, gap: 10 }, heroIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#E8EDFF', alignItems: 'center', justifyContent: 'center' }, title: { color: '#FFF', fontSize: 25, fontWeight: '900' }, intro: { color: '#C8D0ED', fontSize: 15, lineHeight: 22 }, empty: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 10 }, emptyTitle: { color: NAVY, fontSize: 17, fontWeight: '800' }, emptyText: { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center' }, card: { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16 }, row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3E7F2' }, rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' }, rowLabel: { flex: 1, color: NAVY, fontSize: 14, fontWeight: '700' }, rowValue: { color: MUTED, fontSize: 13, maxWidth: 130, textAlign: 'right' }, note: { color: MUTED, fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 }, planCard: { backgroundColor: '#3047C7', borderRadius: 22, padding: 22, gap: 8 }, planEyebrow: { color: '#BFCBFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, planName: { color: '#FFF', fontSize: 26, fontWeight: '900' }, planStatus: { alignSelf: 'flex-start', color: '#D8FFE9', backgroundColor: '#15734C', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, fontWeight: '800' }, planDate: { color: '#DDE3FF', fontSize: 14 } })
