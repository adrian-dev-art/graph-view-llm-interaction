import useGraphStore from '../../store/useGraphStore'

export default function ConversationList({ isOpen, onClose }) {
    const { conversations, currentConvId, setCurrentConvId, createNewConversation } = useGraphStore()

    const handleSelectConversation = (id) => {
        setCurrentConvId(id)
        if (onClose) onClose()
    }

    return (
        <>
            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
                onClick={onClose}
            />

            <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar__header">
                    <h2 className="sidebar__logo-text">NODE VIEW</h2>
                </div>

                <div className="sidebar__content">
                    <div className="sidebar__section-label">HISTORY</div>
                    <div className="sidebar__list">
                        {conversations.map((conv) => (
                            <div
                                key={conv.id}
                                className={`conv-item ${currentConvId === conv.id ? 'active' : ''}`}
                                onClick={() => handleSelectConversation(conv.id)}
                            >
                                <span className="conv-item__title">
                                    {conv.title || 'UNTITLED SESSION'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <button className="btn-new-conv" onClick={() => {
                    createNewConversation()
                    if (onClose) onClose()
                }}>
                    NEW SESSION
                </button>
            </div>
        </>
    )
}
