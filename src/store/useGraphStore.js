import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import dagre from '@dagrejs/dagre'

const TEXT_MODEL = 'llama-3.1-8b-instant'
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY

const dagreGraph = new dagre.graphlib.Graph()
dagreGraph.setDefaultEdgeLabel(() => ({}))

// Helper to convert File to Base64 for Groq Vision
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.onerror = error => reject(error)
    })
}

// Stream AI response from Groq, calling onChunk(text) for each token
async function streamGroqResponse(messages, mediaItems = [], onChunk) {
    const hasImages = mediaItems.some(f => f.type === 'image')
    const model = hasImages ? VISION_MODEL : TEXT_MODEL

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            messages: messages,
            stream: true,
        }),
    })

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
        throw new Error(err.error?.message ?? 'Groq API error')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''

    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === 'data: [DONE]') continue
            if (trimmed.startsWith('data: ')) {
                try {
                    const json = JSON.parse(trimmed.slice(6))
                    const token = json.choices?.[0]?.delta?.content ?? ''
                    if (token) {
                        fullText += token
                        onChunk(fullText)
                    }
                } catch { /* ignore parse errors */ }
            }
        }
    }
    return fullText
}

const SYSTEM_PROMPT = `You are a branching AI mind. You help users explore ideas in a graph structure. 
Each of your responses will be placed in a new node.
If you want to suggest multiple distinct paths or ideas that should each have their own node, separate them with the delimiter: ---NODE---
Example:
Idea 1 details...
---NODE---
Idea 2 details...

Always provide high-quality, relevant responses. Focus on being "inline" with the user's previous thoughts.`

const useGraphStore = create((set, get) => ({
    // Auth
    user: null,
    setUser: (user) => set({ user }),

    // Conversations
    conversations: [],
    currentConvId: null,

    // Graph data
    nodes: [],       // React Flow nodes
    edges: [],       // React Flow edges
    rawNodes: [],    // Our domain nodes from DB

    // UI state
    selectedNodeId: null,
    lastCreatedNodeId: null, // Track for auto-zoom
    lastLayoutTimestamp: 0,  // Track for full fitView
    isAILoading: false,
    streamingNodeId: null,
    streamingText: '',
    searchQuery: '',
    searchResults: [],
    currentSearchIndex: -1,

    setSearchQuery: (query) => {
        const { rawNodes } = get()
        const q = query.toLowerCase()
        const results = query ? rawNodes.filter(n =>
            n.prompt.toLowerCase().includes(q) ||
            (n.response && n.response.toLowerCase().includes(q))
        ).map(n => n.id) : []

        set({
            searchQuery: query,
            searchResults: results,
            currentSearchIndex: results.length > 0 ? 0 : -1,
            selectedNodeId: results.length > 0 ? results[0] : get().selectedNodeId
        })
    },

    nextSearchResult: () => {
        const { searchResults, currentSearchIndex } = get()
        if (searchResults.length === 0) return
        const nextIndex = (currentSearchIndex + 1) % searchResults.length
        set({
            currentSearchIndex: nextIndex,
            selectedNodeId: searchResults[nextIndex]
        })
    },

    // ── Auth ──────────────────────────────────────────────────
    fetchUser: async () => {
        const { data: { session } } = await supabase.auth.getSession()
        set({ user: session?.user ?? null })
    },

    signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, conversations: [], nodes: [], edges: [], rawNodes: [], currentConvId: null })
    },

    // ── Conversations ─────────────────────────────────────────
    fetchConversations: async () => {
        const { user } = get()
        if (!user) return
        const { data } = await supabase
            .from('conversations')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
        if (data) set({ conversations: data })
    },

    createNewConversation: async (title = 'NEW SESSION') => {
        const { user } = get()
        if (!user) return null

        const safeTitle = (typeof title === 'string') ? title : 'NEW SESSION'

        const { data, error } = await supabase
            .from('conversations')
            .insert({ user_id: user.id, title: safeTitle })
            .select()
            .single()
        if (error) throw error
        set(s => ({ conversations: [data, ...s.conversations], currentConvId: data.id }))
        return data
    },

    setCurrentConvId: async (id) => {
        set({ currentConvId: id, selectedNodeId: null, lastCreatedNodeId: null })
        if (id) await get().fetchNodes(id)
        else set({ nodes: [], edges: [], rawNodes: [] })
    },

    deleteConversation: async (id) => {
        const { conversations, currentConvId } = get()
        // Delete conversation (Cascade delete should handle nodes if set in DB, but let's be safe)
        const { error } = await supabase.from('conversations').delete().eq('id', id)
        if (error) throw error

        const newConversations = conversations.filter(c => c.id !== id)
        set({ conversations: newConversations })

        if (currentConvId === id) {
            set({ currentConvId: null, nodes: [], edges: [], rawNodes: [], selectedNodeId: null })
        }
    },

    // ── Nodes ─────────────────────────────────────────────────
    fetchNodes: async (convId) => {
        const { data } = await supabase
            .from('nodes')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true })

        if (!data) return
        const { rfNodes, rfEdges } = buildGraph(data)
        set({ rawNodes: data, nodes: rfNodes, edges: rfEdges })
    },

    uploadFile: async (file) => {
        const { user } = get()
        if (!user || !file) return null
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        const { data, error } = await supabase.storage
            .from('node-media')
            .upload(fileName, file)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
            .from('node-media')
            .getPublicUrl(fileName)

        return {
            url: publicUrl,
            type: file.type.startsWith('video') ? 'video' : 'image',
            name: file.name
        }
    },

    addNode: async (prompt, parentId = null, files = []) => {
        const { currentConvId, rawNodes, conversations } = get()
        let convId = currentConvId

        if (!convId) {
            const conv = await get().createNewConversation(prompt.slice(0, 50).toUpperCase() || 'NEW SESSION')
            convId = conv.id
        }

        const parent = rawNodes.find(n => n.id === parentId)
        const childrenCount = rawNodes.filter(n => n.parent_id === parentId).length
        const pos = calculatePosition(parent, childrenCount)

        set({ isAILoading: true, lastCreatedNodeId: null })

        let mediaItems = []
        if (files && files.length > 0) {
            const uploadPromises = Array.from(files).map(f => get().uploadFile(f))
            try {
                const results = await Promise.all(uploadPromises)
                mediaItems = results.filter(r => !!r)
            } catch (err) { console.error('Upload failed', err) }
        }

        const { data: newNode, error } = await supabase
            .from('nodes')
            .insert({
                conversation_id: convId,
                parent_id: parentId,
                prompt,
                response: '',
                pos_x: pos.x,
                pos_y: pos.y,
                media_items: mediaItems
            })
            .select()
            .single()

        if (error) { set({ isAILoading: false }); throw error }

        const updatedRaw = [...rawNodes, newNode]
        const { rfNodes, rfEdges } = buildGraph(updatedRaw)

        set({
            rawNodes: updatedRaw,
            nodes: rfNodes,
            edges: rfEdges,
            streamingNodeId: newNode.id,
            streamingText: '',
            lastCreatedNodeId: newNode.id
        })

        // Gather history
        const messages = [{ role: 'system', content: SYSTEM_PROMPT }]
        const historyPath = []
        let curr = parent
        while (curr) {
            historyPath.unshift(curr)
            curr = rawNodes.find(n => n.id === curr.parent_id)
        }

        historyPath.forEach(h => {
            let content = h.prompt
            if (h.media_items && h.media_items.some(m => m.type === 'image')) {
                content = [{ type: 'text', text: h.prompt }]
                h.media_items.filter(m => m.type === 'image').slice(0, 3).forEach(m => {
                    content.push({ type: 'image_url', image_url: { url: m.url } })
                })
            }
            messages.push({ role: 'user', content })
            if (h.response) {
                messages.push({ role: 'assistant', content: h.response })
            }
        })

        // Add current prompt
        let currentContent = prompt
        if (mediaItems.length > 0) {
            currentContent = [{ type: 'text', text: prompt }]
            mediaItems.filter(m => m.type === 'image').slice(0, 3).forEach(m => {
                currentContent.push({ type: 'image_url', image_url: { url: m.url } })
            })
        }
        messages.push({ role: 'user', content: currentContent })

        let response = ''
        try {
            response = await streamGroqResponse(messages, mediaItems, (partial) => {
                set({ streamingText: partial })
            })
        } catch (aiErr) {
            response = `ERROR: ${aiErr.message}`
            set({ streamingText: response })
        }

        const nodeParts = response.split('---NODE---').map(p => p.trim()).filter(p => !!p)
        const mainResponse = nodeParts[0] || ''

        await supabase.from('nodes').update({ response: mainResponse }).eq('id', newNode.id)

        let finalRaw = updatedRaw.map(n => n.id === newNode.id ? { ...n, response: mainResponse } : n)

        // Handle additional nodes
        if (nodeParts.length > 1) {
            for (let i = 1; i < nodeParts.length; i++) {
                const extraResponse = nodeParts[i]
                const extraPos = calculatePosition(parent, childrenCount + i)
                const { data: extraNode } = await supabase
                    .from('nodes')
                    .insert({
                        conversation_id: convId,
                        parent_id: parentId,
                        prompt: '(AUTOMATIC BRANCH)',
                        response: extraResponse,
                        pos_x: extraPos.x,
                        pos_y: extraPos.y,
                        media_items: []
                    })
                    .select()
                    .single()
                if (extraNode) finalRaw.push(extraNode)
            }
        }

        const { rfNodes: finalRfNodes, rfEdges: finalEdges } = buildGraph(finalRaw)

        set({
            rawNodes: finalRaw,
            nodes: finalRfNodes,
            edges: finalEdges,
            isAILoading: false,
            streamingNodeId: null,
            streamingText: '',
            selectedNodeId: newNode.id,
        })

        return newNode
    },

    layoutGraph: () => {
        const { nodes, edges } = get()
        if (nodes.length === 0) return

        const g = new dagre.graphlib.Graph()
        g.setGraph({
            rankdir: 'LR',
            ranksep: 200,    // Level distance
            nodesep: 120,    // Lateral distance between same-rank nodes
            ranker: 'tight-tree',
            marginx: 100,
            marginy: 100
        })
        g.setDefaultEdgeLabel(() => ({}))

        const nodeWidth = 340
        const nodeHeight = 220

        nodes.forEach((node) => {
            g.setNode(node.id, { width: nodeWidth, height: nodeHeight })
        })

        edges.forEach((edge) => {
            g.setEdge(edge.source, edge.target)
        })

        dagre.layout(g)

        const positionedNodes = nodes.map((node) => {
            const nodeWithPosition = g.node(node.id)
            return {
                ...node,
                position: {
                    x: nodeWithPosition.x - nodeWidth / 2,
                    y: nodeWithPosition.y - nodeHeight / 2,
                },
            }
        })

        set({ nodes: positionedNodes, lastLayoutTimestamp: Date.now() })

        // Batch update positions to DB
        positionedNodes.forEach(n => {
            supabase.from('nodes')
                .update({ pos_x: n.position.x, pos_y: n.position.y })
                .eq('id', n.id)
                .then(() => { })
        })
    },

    deleteNode: async (nodeId) => {
        const { rawNodes } = get()
        const toDeleteIds = []
        const collect = (id) => {
            toDeleteIds.push(id)
            rawNodes.filter(n => n.parent_id === id).forEach(c => collect(c.id))
        }
        collect(nodeId)

        const { error } = await supabase.from('nodes').delete().in('id', toDeleteIds)
        if (error) throw error

        const newRaw = rawNodes.filter(n => !toDeleteIds.includes(n.id))
        const { rfNodes, rfEdges } = buildGraph(newRaw)
        set({ rawNodes: newRaw, nodes: rfNodes, edges: rfEdges, selectedNodeId: null })
    },

    toggleNodeCollapse: async (nodeId) => {
        const { rawNodes } = get()
        const node = rawNodes.find(n => n.id === nodeId)
        if (!node) return
        const newStatus = !node.is_collapsed
        await supabase.from('nodes').update({ is_collapsed: newStatus }).eq('id', nodeId)
        const newRaw = rawNodes.map(n => n.id === nodeId ? { ...n, is_collapsed: newStatus } : n)
        const { rfNodes, rfEdges } = buildGraph(newRaw)
        set({ rawNodes: newRaw, nodes: rfNodes, edges: rfEdges })
    },

    setSelectedNodeId: (id) => set({ selectedNodeId: id }),
    clearSelection: () => set({ selectedNodeId: null }),

    onNodesChange: (changes) => {
        set(s => {
            let nodes = [...s.nodes]
            for (const change of changes) {
                if (change.type === 'position' && change.position) {
                    nodes = nodes.map(n => n.id === change.id ? { ...n, position: change.position } : n)
                    // Debounced DB sync
                    clearTimeout(window._posSyncTimer)
                    window._posSyncTimer = setTimeout(() => {
                        supabase.from('nodes')
                            .update({ pos_x: change.position.x, pos_y: change.position.y })
                            .eq('id', change.id)
                            .then(() => { })
                    }, 500)
                }
            }
            return { nodes }
        })
    },
    onEdgesChange: () => { },
    onConnect: () => { },
}))

function calculatePosition(parent, childrenCount) {
    if (!parent) return { x: 50, y: 50 }

    // Spread children vertically to avoid overlap
    const levelSpacing = 450
    const verticalSpacing = 350
    // Alternate Y offset to branch out vertically
    const yOffset = (childrenCount % 2 === 0 ? 1 : -1) * Math.ceil(childrenCount / 2) * verticalSpacing

    return {
        x: (parent.pos_x ?? 0) + levelSpacing,
        y: (parent.pos_y ?? 0) + yOffset
    }
}

function buildGraph(rawNodes) {
    const collapsedSourceIds = new Set(rawNodes.filter(n => n.is_collapsed).map(n => n.id))
    const isHidden = (id) => {
        let curr = rawNodes.find(n => n.id === id)
        while (curr && curr.parent_id) {
            if (collapsedSourceIds.has(curr.parent_id)) return true
            curr = rawNodes.find(n => n.id === curr.parent_id)
        }
        return false
    }

    const visibleRaw = rawNodes.filter(n => !isHidden(n.id))
    const rfNodes = visibleRaw.map(n => ({
        id: n.id,
        type: 'aiNode',
        position: { x: n.pos_x ?? 0, y: n.pos_y ?? 0 },
        data: { ...n }
    }))

    const rfEdges = visibleRaw.filter(n => n.parent_id).map(n => ({
        id: `e-${n.parent_id}-${n.id}`,
        source: n.parent_id,
        target: n.id,
        type: 'step',
        style: { stroke: '#fff', strokeWidth: 1.5 }
    }))

    return { rfNodes, rfEdges }
}

export default useGraphStore
