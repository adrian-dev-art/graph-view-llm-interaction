import { motion } from 'framer-motion'
import useGraphStore from '../../store/useGraphStore'

export default function SearchBar() {
    const { searchQuery, setSearchQuery, nextSearchResult, searchResults, currentSearchIndex } = useGraphStore()

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            nextSearchResult()
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="search-bar"
        >
            <div className="search-bar__inner">
                <input
                    type="text"
                    placeholder="FIND..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
                {searchQuery && (
                    <div className="search-info" style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>
                        {searchResults.length > 0 ? `${currentSearchIndex + 1}/${searchResults.length}` : '0 DISCOVERED'}
                    </div>
                )}
                {searchQuery && (
                    <button
                        style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 10 }}
                        onClick={() => setSearchQuery('')}
                    >
                        CLEAR
                    </button>
                )}
            </div>
        </motion.div>
    )
}
