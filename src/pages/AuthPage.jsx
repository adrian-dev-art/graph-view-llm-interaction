import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isSignUp, setIsSignUp] = useState(false)
    const navigate = useNavigate()

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) navigate('/')
        })
    }, [navigate])

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = isSignUp
                ? await supabase.auth.signUp({ email, password })
                : await supabase.auth.signInWithPassword({ email, password })

            if (error) throw error
            if (!isSignUp) navigate('/')
            else alert('Check your email for confirmation!')
        } catch (err) {
            alert(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title serif-text">
                    {isSignUp ? 'REGISTER' : 'LOG IN'}
                </h1>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 32 }}>
                    {isSignUp ? 'CREATE YOUR SESSION' : 'ACCESS YOUR NODES'}
                </p>

                <form className="auth-form" onSubmit={handleAuth}>
                    <input
                        type="email"
                        placeholder="EMAIL"
                        className="auth-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="PASSWORD"
                        className="auth-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button className="btn-send" style={{ width: '100%', marginTop: 16 }} disabled={loading}>
                        {loading ? 'PROCESSING...' : (isSignUp ? 'REGISTER' : 'LOG IN')}
                    </button>
                </form>

                <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: '#666' }}>
                    {isSignUp ? 'ALREADY HAVE AN ACCOUNT? ' : 'NEW HERE? '}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
                    >
                        {isSignUp ? 'LOG IN' : 'REGISTER'}
                    </button>
                </div>
            </div>
        </div>
    )
}
