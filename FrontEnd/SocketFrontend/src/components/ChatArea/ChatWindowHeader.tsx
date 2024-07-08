import './ChatWindowHeader.css'

import AddToChat from './HeaderButtons/AddToChat'

export default function ChatWindowHeader(){

    return (
        <header className="ChatWindow-Header">
            <AddToChat />
        </header>
    )
}