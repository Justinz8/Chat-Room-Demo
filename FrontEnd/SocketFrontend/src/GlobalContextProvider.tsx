import { createContext } from "react";
import { useState, useMemo } from "react";


const ChatIDContext = createContext<any[]>([]);
const FriendsContext = createContext<any[]>([]);

interface props{
    children: React.ReactElement[] | React.ReactElement
}

export function GlobalContextWrapper(props:props){
    const [currentChatID, setCurrentChatID] = useState<string>("");
    const [Friends, setFriends] = useState<string[]>([]);

    const ChatIdContextValue = useMemo(()=>([
        currentChatID,
        setCurrentChatID
    ]), [currentChatID])

    const FriendsValue = useMemo(()=>([
        Friends, 
        setFriends
    ]), [Friends])

    return (
        <ChatIDContext.Provider value={ChatIdContextValue}>
            <FriendsContext.Provider value={FriendsValue}>
                {props.children}
            </FriendsContext.Provider>
        </ChatIDContext.Provider>
    )
}

export function getFriendsContext(){
    return FriendsContext
}

export function getChatIDContext(){
    return ChatIDContext;
}