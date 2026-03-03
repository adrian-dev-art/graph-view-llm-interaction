import { useState } from 'react'
import useGraphStore from '../../store/useGraphStore'

export default function PromptInput() {
    const { addNode, isAILoading } = useGraphStore()
    const [prompt, setPrompt] = useState('')
    const [files, setFiles] = useState([])

    const handleSend = async () => {
        if ((prompt.trim() || files.length > 0) && !isAILoading) {
            await addNode(prompt.trim(), null, files)
            setPrompt('')
            setFiles([])
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="prompt-bar-container">
            <div className="prompt-bar__form">
                {files.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                        {files.map((f, i) => (
                            <div key={i} style={{ fontSize: 11, border: '1px solid #222', padding: '4px 10px', color: '#888' }}>
                                {f.name} <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#444', marginLeft: 6, cursor: 'pointer' }}>x</button>
                            </div>
                        ))}
                    </div>
                )}
                <textarea
                    className="prompt-bar__textarea"
                    placeholder="ENTER PROMPT..."
                    rows={1}
                    value={prompt}
                    onChange={(e) => {
                        setPrompt(e.target.value)
                        e.target.style.height = 'auto'
                        e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    onKeyDown={handleKeyDown}
                />
                <div className="prompt-bar__footer">
                    <label style={{ cursor: 'pointer', fontSize: 11, color: '#666', borderBottom: '1px solid #222' }}>
                        ATTACH MEDIA
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
                        disabled={isAILoading || (!prompt.trim() && files.length === 0)}
                        onClick={handleSend}
                    >
                        {isAILoading ? 'GENERATING...' : 'EXECUTE'}
                    </button>
                </div>
            </div>
        </div>
    )
}
