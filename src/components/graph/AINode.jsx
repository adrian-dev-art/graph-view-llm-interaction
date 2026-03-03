import { Handle, Position } from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import useGraphStore from '../../store/useGraphStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function AINode({ data, selected }) {
    const {
        isAILoading,
        streamingNodeId,
        streamingText,
        searchQuery,
        deleteNode,
        toggleNodeCollapse
    } = useGraphStore()

    const isStreaming = streamingNodeId === data.id
    const displayResponse = isStreaming ? streamingText : data.response

    // Highlight if search matches
    const isMatched = searchQuery && (
        data.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (data.response && data.response.toLowerCase().includes(searchQuery.toLowerCase()))
    )

    return (
        <div className={`ai-node ${selected ? 'selected' : ''} ${isMatched ? 'matched' : ''}`}>
            {/* Handles for connections */}
            <Handle type="target" position={Position.Left} className="node-handle" />
            <Handle type="source" position={Position.Right} className="node-handle" />

            {/* Toolbar - Minimalist Label based */}
            <AnimatePresence>
                {selected && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="ai-node__toolbar"
                    >
                        <button onClick={(e) => { e.stopPropagation(); toggleNodeCollapse(data.id); }} title="Toggle Branch">
                            {data.is_collapsed ? 'SHOW BRANCH' : 'HIDE BRANCH'}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteNode(data.id); }} className="delete" title="Delete Node">
                            DELETE
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="ai-node__header">
                <p className="ai-node__prompt serif-text">{data.prompt}</p>
            </div>

            <div className="ai-node__body">
                {/* Media Slider (Monochrome) */}
                {data.media_items && data.media_items.length > 0 && (
                    <div className="ai-node__media-container">
                        {data.media_items.map((item, idx) => (
                            <div key={idx} className="media-slide">
                                {item.type === 'video' ? (
                                    <div className="media-placeholder">VIDEO</div>
                                ) : (
                                    <img src={item.url} alt="" />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="ai-node__response-container">
                    {isAILoading && isStreaming && !streamingText ? (
                        <div className="skeleton-container">
                            <div className="skeleton-line" style={{ width: '100%' }} />
                            <div className="skeleton-line" style={{ width: '80%' }} />
                            <div className="skeleton-line" style={{ width: '60%' }} />
                        </div>
                    ) : (
                        <div className={`ai-node__response ${displayResponse?.length > 200 ? 'truncated' : ''}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayResponse}</ReactMarkdown>
                            {isStreaming && <span className="cursor-blink" />}
                            {displayResponse?.length > 200 && <div className="read-more-fade" />}
                        </div>
                    )}
                </div>
            </div>

            {/* Minimalist Footer */}
            <div className="ai-node__footer">
                <span className="node-type-badge">{data.parent_id ? 'BRANCH' : 'ORIGIN'}</span>
            </div>
        </div>
    )
}
