import "./ChatWindow.css";

import { useState, useEffect } from "react";

import { useSocket } from "../../CustomHooks";

import MessageCard from "./MessageCard";

import { Message } from "../../interfaces";

import { useFetch } from "../../CustomHooks";
interface props{
  currentChatID: string,
}

export default function ChatWindow(props: props) {
  const socket = useSocket();

  const currentChatID = props.currentChatID;

  const [message, SetMessage] = useState("");

  const [currentMessages, SetCurrentMessages] = useState<Message[]>([]);

  const Fetch = useFetch('http://localhost:3000');

  useEffect(() => {
    if (socket) {
      socket.on(`RecieveMessage`, (message: Message) => {
        SetCurrentMessages((x) => [...x, message]);
      });
    }
    return () => {
      if (socket) socket.off(`RecieveMessage`);
    };
  }, [socket]);

  useEffect(() => {
    if (currentChatID) {
      Fetch('getChatMessages', {
        chatID: currentChatID,
      }).then((data) => {
        SetCurrentMessages(data.ChatMessages);
      });
    }
  }, [currentChatID]);

  function messageChange(e: React.ChangeEvent<HTMLInputElement>) {
    SetMessage(e.target.value);
  }

  function submitMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if(socket){
      socket.emit(`SendMessage`, { message: message, chatID: currentChatID });
    }
    
    SetMessage("");
  }

  const messages = currentMessages.map((message: Message, index: number) => {
    let merge = false;

    if (index - 1 >= 0 && message.uid === currentMessages[index - 1]?.uid) {
      merge = true;
    }

    return (
      <MessageCard
        uid={message.uid}
        message={message.message}
        time={new Date(message.timestamp).toUTCString()}
        merge={merge}
        key={index}
      />
    );
  });

  return (
    <div className="ChatWindow-Wrapper">
      <div className="ChatWindow-Content"></div>
      <form className="TypeBar" onSubmit={submitMessage}>
        {messages}
        <input type="text" onChange={messageChange} value={message} />
        <button>Send</button>
      </form>
    </div>
  );
}
