import './ChatWindowHeader.css'

import AddToChat from './HeaderButtons/AddToChat'
import LeaveChat from './HeaderButtons/LeaveChat'

import { useSocket } from '../../CustomHooks';

import { useContext, useEffect, useState, useRef } from 'react';

import { getChatContext } from '../../GlobalContextProvider';

export default function ChatWindowHeader(){

    const {currentChat, } = useContext(getChatContext());

    const [ChatTitle, setChatTitle] = useState<string>("")

    const titleRef = useRef<HTMLFormElement>(null);

    const socket = useSocket()

    useEffect(() => { //if click out of title then reset title to original
        const handleClickOutside = (event: MouseEvent) => {
            if (titleRef.current && !titleRef.current.contains(event.target as Node)) {
                setChatTitle(currentChat.name)
            }
        };

        document.addEventListener('click', handleClickOutside)

        return () => {
            document.removeEventListener('click', handleClickOutside)
        }
    }, [currentChat])

    useEffect(()=>{
        setChatTitle(currentChat.name)
    }, [currentChat.id, currentChat.name])

    function ChatTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setChatTitle(e.target.value);
    }

    function handleUpdateTitle(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if(socket){
            socket.emit('updateTitle', {newTitle: ChatTitle, chatID: currentChat.id});
        }
    }

    return (
        <header className="ChatWindow-Header">

            <form ref={titleRef} onSubmit={handleUpdateTitle}>
                <input type='text' value={ChatTitle} onChange={ChatTitleChange}/>
                <button type='submit' hidden={true}></button>
            </form>

            <AddToChat />
            <LeaveChat />
        </header>
    )
}