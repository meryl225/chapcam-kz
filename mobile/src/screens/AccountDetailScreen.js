import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, PAD } from '../ui/catalog'

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
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Retour au profil" onPress={onBack} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={NAVY} />
        </Pressable>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><Ionicons name={config.icon} size={25} color={C.blue} /></View>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.intro}>{config.intro}</Text>
        </View>
        {type === 'activity' ? <ActivityEmpty /> : null}
        {type === 'purchases' ? <Purchases subscription={subscription} jetons={jetons} /> : null}
        {type === 'subscription' ? <Subscription subscription={subscription} /> : null}
      </ScrollView>
    </View>
  )
}

function ActivityEmpty() {
  return <View style={styles.empty}><Ionicons name="sparkles-outline" size={30} color={C.violet} /><Text style={styles.emptyTitle}>Ton activité apparaîtra ici</Text><Text style={styles.emptyText}>Tes créations et consommations seront regroupées dans un historique simple à consulter.</Text></View>
}

function Purchases({ subscription, jetons }) {
  const plan = subscription?.plan || 'Aucun forfait actif'
  return <>
    <View style={styles.card}><Row icon="diamond-outline" label="Abonnement" value={plan} /><Row icon="wallet-outline" label="Solde actuel" value={`${Number(jetons || subscription?.points || 0).toLocaleString('fr-FR')} Jetons`} /><Row icon="calendar-outline" label="Prochain renouvellement" value={subscription?.expires_at || subscription?.end_date ? new Date(subscription.expires_at || subscription.end_date).toLocaleDateString('fr-FR') : '—'} /></View>
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

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: BG }, header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: PAD, backgroundColor: BG }, back: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E8EDFF', alignItems: 'center', justifyContent: 'center' }, headerTitle: { flex: 1, textAlign: 'center', color: NAVY, fontSize: 17, fontWeight: '800' }, headerSpacer: { width: 42 }, content: { padding: PAD, paddingBottom: 40, gap: 16 }, hero: { backgroundColor: NAVY, borderRadius: 24, padding: 22, gap: 10 }, heroIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#E8EDFF', alignItems: 'center', justifyContent: 'center' }, title: { color: '#FFF', fontSize: 25, fontWeight: '900' }, intro: { color: '#C8D0ED', fontSize: 15, lineHeight: 22 }, empty: { backgroundColor: '#FFF', borderRadius: 20, padding: 28, alignItems: 'center', gap: 10 }, emptyTitle: { color: NAVY, fontSize: 17, fontWeight: '800' }, emptyText: { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center' }, card: { backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 16 }, row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E3E7F2' }, rowIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EAF1FF', alignItems: 'center', justifyContent: 'center' }, rowLabel: { flex: 1, color: NAVY, fontSize: 14, fontWeight: '700' }, rowValue: { color: MUTED, fontSize: 13, maxWidth: 130, textAlign: 'right' }, note: { color: MUTED, fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 }, planCard: { backgroundColor: '#3047C7', borderRadius: 22, padding: 22, gap: 8 }, planEyebrow: { color: '#BFCBFF', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }, planName: { color: '#FFF', fontSize: 26, fontWeight: '900' }, planStatus: { alignSelf: 'flex-start', color: '#D8FFE9', backgroundColor: '#15734C', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, fontWeight: '800' }, planDate: { color: '#DDE3FF', fontSize: 14 } })
