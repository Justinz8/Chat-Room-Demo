
import { Chat, User } from "../../interfaces";

import { useContext } from "react";
import { useSocket } from "../../CustomHooks";

import { getChatIDContext } from "../../GlobalContextProvider";
interface props{
  chatDetails: Chat
}

export default function ChatCard(props: props) {

  const socket = useSocket();

  const [currentChatID, setCurrentChatID] = useContext(getChatIDContext());

  function setCurrentChat(ID: string) {
    if (currentChatID === ID) return;
    if(socket){
      socket.emit("leaveRoom", currentChatID);
      socket.emit("joinRoom", ID);
    }
    setCurrentChatID(ID);
  }

  return (
    <button
      className="ChatCard-Wrapper"
      onClick={() => {
        setCurrentChat(props.chatDetails.id);
      }}
    >
      <h1 className="ChatCard-Name">{props.chatDetails.name}</h1>
      <p className="ChatCard-Members">
        {props.chatDetails.members.map((x: User) => x.Username).toString()}
      </p>
    </button>
  );
}
