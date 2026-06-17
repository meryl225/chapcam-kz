import { ProxyProClient } from '@/components/dashboard/proxy-pro-client'
import { PROXY_PRODUCTS } from '@/lib/proxy/products'

export default function ProxyProPage() {
  // Vitrine uniquement : le fournisseur n'est pas encore choisi, donc aucun
  // prix n'est calculé ni affiché (cf. lib/proxy/products.ts).
  return <ProxyProClient products={PROXY_PRODUCTS} />
}
