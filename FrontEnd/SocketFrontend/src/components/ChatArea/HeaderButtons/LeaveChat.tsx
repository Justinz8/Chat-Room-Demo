import { useSocket } from "../../../CustomHooks"

import { useContext } from "react"

import { getChatContext } from "../../../GlobalContextProvider"

export default function LeaveChat(){

    const socket = useSocket()

    const {currentChat} = useContext(getChatContext())

    function LeaveChatHandler(){
        if(socket){
            socket.emit("LeaveChat", currentChat.id)
        }
    }

    return (
        <button className="ChatHeader-Button LeaveChat-Toggle" onClick={LeaveChatHandler}>
        </button>
    )
}