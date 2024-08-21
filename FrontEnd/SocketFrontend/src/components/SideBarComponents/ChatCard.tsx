
import { Chat } from "../../interfaces";

import { useContext } from "react";
import { useSocket } from "../../CustomHooks";

import { getChatContext } from "../../GlobalContextProvider";
interface props{
  chatDetails: Chat
}

export default function ChatCard(props: props) {

  const socket = useSocket();

  const {currentChat, SetCurrentChat} = useContext(getChatContext());

  /*
    Join the chat with id ID on the backend to start recieving messages for the chat 
    in real time
  */
  function JoinCurrentChat(ID: string) {
    if (currentChat.id === ID) return;
    if(socket){
      if(currentChat.id) socket.emit("leaveRoom", currentChat.id);
      socket.emit("joinRoom", ID);
    }
    SetCurrentChat(props.chatDetails);
  }

  return (
    <button
      className="ChatCard-Wrapper"
      onClick={() => {
        JoinCurrentChat(props.chatDetails.id);
      }}
    >
      <h1 className="ChatCard-Name">{props.chatDetails.name}</h1>
      <p className="ChatCard-Members">
        {`${props.chatDetails.members.length} Members`}
      </p>
    </button>
  );
}
