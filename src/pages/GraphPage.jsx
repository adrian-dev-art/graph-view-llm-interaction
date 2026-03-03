import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import GraphCanvas from '../components/graph/GraphCanvas'
import NodeDetail from '../components/graph/NodeDetail'
import PromptInput from '../components/ui/PromptInput'
import ConversationList from '../components/ui/ConversationList'
import SearchBar from '../components/ui/SearchBar'
import useGraphStore from '../store/useGraphStore'

export default function GraphPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="app-shell">
            {/* Sidebar toggle for mobile */}
            <button
                className="mobile-nav-toggle"
                onClick={() => setIsSidebarOpen(true)}
            >
                HISTORY
            </button>

            {/* Sidebar with history */}
            <ConversationList isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Main area with graph and prompt */}
            <div className="graph-area">
                <SearchBar />

                <div className="floating-controls">
                    <button className="btn-secondary" onClick={() => useGraphStore.getState().layoutGraph()}>
                        TIDY UP
                    </button>
                </div>

                <ReactFlowProvider>
                    <GraphCanvas />
                    <PromptInput />
                </ReactFlowProvider>
            </div>

            {/* Sliding detail panel */}
            <NodeDetail />
        </div>
    )
}
