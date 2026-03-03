import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useGraphStore from './store/useGraphStore'
import AuthPage from './pages/AuthPage'
import GraphPage from './pages/GraphPage'
import { supabase } from './lib/supabase'

function PrivateRoute({ children }) {
    const user = useGraphStore(s => s.user)
    return user ? children : <Navigate to="/auth" replace />
}

export default function App() {
    const { setUser, fetchConversations } = useGraphStore()

    useEffect(() => {
        // Get session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) fetchConversations()
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) fetchConversations()
        })

        return () => subscription.unsubscribe()
    }, [])

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <GraphPage />
                        </PrivateRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
