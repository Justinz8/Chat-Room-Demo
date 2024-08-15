import './ChatWindowHeader.css'

import AddToChat from './HeaderButtons/AddToChat'
import LeaveChat from './HeaderButtons/LeaveChat'

export default function ChatWindowHeader(){

    return (
        <header className="ChatWindow-Header">
            <AddToChat />
            <LeaveChat />
        </header>
    )
}