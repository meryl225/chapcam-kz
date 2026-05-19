'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignUp = async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#111',padding:'40px',borderRadius:'16px',width:'100%',maxWidth:'400px',border:'1px solid rgba(255,255,255,0.1)'}}>
        <h1 style={{color:'white',textAlign:'center',marginBottom:'8px',fontSize:'24px',fontWeight:'700'}}>
          Chap<span style={{color:'#00ff88'}}>Cam</span>
        </h1>
        <p style={{color:'#888',textAlign:'center',marginBottom:'24px',fontSize:'14px'}}>
          Crée ton compte pour commencer
        </p>
        {error && (
          <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid #ef4444',color:'#ef4444',padding:'12px',borderRadius:'8px',marginBottom:'16px',fontSize:'14px'}}>
            {error}
          </div>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{width:'100%',padding:'12px',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'white',marginBottom:'12px',fontSize:'14px',boxSizing:'border-box'}}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{width:'100%',padding:'12px',background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'8px',color:'white',marginBottom:'20px',fontSize:'14px',boxSizing:'border-box'}}
        />
        <button
          onClick={handleSignUp}
          disabled={loading || !email || !password}
          style={{width:'100%',padding:'14px',background:'#00ff88',border:'none',borderRadius:'8px',color:'black',fontWeight:'700',fontSize:'15px',cursor:'pointer'}}
        >
          {loading ? 'Création...' : 'CRÉER MON COMPTE'}
        </button>
        <p style={{textAlign:'center',marginTop:'16px',color:'#888',fontSize:'14px'}}>
          Déjà un compte ?{' '}
          <a href="/auth/login" style={{color:'#00ff88'}}>Se connecter</a>
        </p>
      </div>
    </div>
  )
}
