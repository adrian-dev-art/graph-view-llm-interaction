import { useCallback } from 'react'
import {
    ReactFlow,
    Background,
    Controls,
    addEdge,
    useNodesState,
    useEdgesState,
    ConnectionLineType,
    useReactFlow
} from '@xyflow/react'
import { useEffect } from 'react'
import '@xyflow/react/dist/style.css'
import useGraphStore from '../../store/useGraphStore'
import AINode from './AINode'

const nodeTypes = {
    aiNode: AINode
}

export default function GraphCanvas() {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        setSelectedNodeId,
        searchResults,
        currentSearchIndex,
        lastCreatedNodeId,
        lastLayoutTimestamp
    } = useGraphStore()

    const { fitView } = useReactFlow()

    // Auto-zoom to search result OR new node OR full layout
    useEffect(() => {
        let targetId = null
        if (searchResults.length > 0 && currentSearchIndex >= 0) {
            targetId = searchResults[currentSearchIndex]
        } else if (lastCreatedNodeId) {
            targetId = lastCreatedNodeId
        }

        if (targetId) {
            fitView({
                nodes: [{ id: targetId }],
                duration: 800,
                padding: 0.8
            })
        }
    }, [searchResults, currentSearchIndex, lastCreatedNodeId, fitView])

    // Full graph fitView after tidy up
    useEffect(() => {
        if (lastLayoutTimestamp > 0) {
            fitView({ duration: 1000, padding: 0.1 })
        }
    }, [lastLayoutTimestamp, fitView])

    const onNodeClick = useCallback((_, node) => {
        setSelectedNodeId(node.id)
    }, [setSelectedNodeId])

    const onPaneClick = useCallback(() => {
        setSelectedNodeId(null)
    }, [setSelectedNodeId])

    return (
        <div className="graph-canvas">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                connectionLineType={ConnectionLineType.Step}
                defaultEdgeOptions={{ type: 'step' }}
                nodeOrigin={[0, 0]}
                fitView
            >
                <Background
                    variant="dots"
                    gap={32}
                    size={1}
                    color="#111"
                />
                <Controls showInteractive={false} />
            </ReactFlow>
        </div>
    )
}
