import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useGraphStore from '../../store/useGraphStore'

export default function NodeDetail() {
    const {
        selectedNodeId,
        rawNodes,
        clearSelection,
        addNode,
        isAILoading,
        streamingNodeId,
        streamingText
    } = useGraphStore()

    const node = rawNodes.find(n => n.id === selectedNodeId)
    const isStreaming = streamingNodeId === node?.id

    const displayResponse = isStreaming ? streamingText : node?.response

    return (
        <AnimatePresence>
            {node && (
                <motion.div
                    key={node.id}
                    className="node-panel"
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                >
                    <div className="node-panel__header">
                        <div className="node-panel__header-info">
                            <span className="node-panel__title serif-text">Node Detail</span>
                            <span className="node-panel__id">ID: {node.id.slice(0, 8)}</span>
                        </div>
                        <button className="btn-close-panel" onClick={clearSelection}>×</button>
                    </div>

                    <div className="node-panel__body">
                        {/* Prompt Segment */}
                        <div className="node-panel__section">
                            <div className="node-panel__label">PROMPT ORIGIN</div>
                            <p className="node-panel__prompt-text serif-text">{node.prompt}</p>
                        </div>

                        {/* Media Segment (Flush) */}
                        {node.media_items && node.media_items.length > 0 && (
                            <div className="node-panel__media-gallery">
                                {node.media_items.map((item, idx) => (
                                    <div key={idx} className="gallery-item">
                                        {item.type === 'video' ? (
                                            <div className="media-placeholder">VIDEO CONTENT</div>
                                        ) : (
                                            <img src={item.url} alt="" onClick={() => window.open(item.url, '_blank')} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="node-panel__section">
                            <div className="node-panel__label">AI RESPONSE</div>

                            {isStreaming ? (
                                <div className="node-panel__response-text">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                                    <span className="cursor-blink" />
                                </div>
                            ) : displayResponse ? (
                                <div className="node-panel__response-text">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayResponse}</ReactMarkdown>
                                </div>
                            ) : (
                                <div className="skeleton-container">
                                    <div className="skeleton-line" style={{ width: '100%' }} />
                                    <div className="skeleton-line" style={{ width: '80%' }} />
                                    <div className="skeleton-line" style={{ width: '60%' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer / Branch Input */}
                    <div className="node-panel__footer">
                        <BranchInput
                            onSubmit={(p, files) => addNode(p, selectedNodeId, files)}
                            disabled={isAILoading}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function BranchInput({ onSubmit, disabled }) {
    const [files, setFiles] = useState([])
    const [prompt, setPrompt] = useState('')

    const handleSend = () => {
        if ((prompt.trim() || files.length > 0) && !disabled) {
            onSubmit(prompt.trim(), files)
            setPrompt('')
            setFiles([])
        }
    }

    return (
        <div className="prompt-bar__form">
            {files.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    {files.map((f, i) => (
                        <div key={i} style={{ fontSize: 10, border: '1px solid #333', padding: '2px 8px' }}>
                            {f.name} <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>x</button>
                        </div>
                    ))}
                </div>
            )}
            <textarea
                className="prompt-bar__textarea"
                placeholder="PROMPT BRANCH..."
                rows={1}
                value={prompt}
                onChange={e => {
                    setPrompt(e.target.value)
                    e.target.style.height = 'auto'
                    e.target.style.height = e.target.scrollHeight + 'px'
                }}
                onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                    } else if (e.key === 'Enter' && e.ctrlKey) {
                        e.preventDefault()
                        handleSend()
                    } else if (e.key === '/' && e.ctrlKey) {
                        e.preventDefault()
                        document.getElementById('global-search-input')?.focus()
                    }
                }}
                disabled={disabled}
            />
            <div className="prompt-bar__footer">
                <label style={{ cursor: 'pointer', fontSize: 11, color: '#666' }}>
                    + ADD MEDIA
                    <input
                        type="file"
                        multiple
                        hidden
                        onChange={e => setFiles([...files, ...Array.from(e.target.files)])}
                        accept="image/*,video/*"
                    />
                </label>
                <button
                    className="btn-send"
                    disabled={disabled || (!prompt.trim() && files.length === 0)}
                    onClick={handleSend}
                >
                    BRANCH
                </button>
            </div>
        </div>
    )
}
