import "./ChatWindow.css";

import { useState, useEffect } from "react";

import { useSocket } from "../../CustomHooks";

import MessageCard from "./MessageCard";

import { Message } from "../../interfaces";

import { useFetch } from "../../CustomHooks";

import { useContext } from "react";
import { getChatIDContext } from "../../GlobalContextProvider";

import ChatWindowHeader from "./ChatWindowHeader";

export default function ChatWindow() {
  const socket = useSocket();

  const [currentChatID] = useContext(getChatIDContext());

  const [message, SetMessage] = useState("");

  const [currentMessages, SetCurrentMessages] = useState<Message[]>([]);

  const Fetch = useFetch('http://localhost:3000');

  useEffect(() => {
    if (socket) {
      socket.on(`RecieveMessage`, (message: Message) => {
        console.log(message);
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

    if (message.type===1 && index - 1 >= 0 && message.sender.uid === currentMessages[index - 1]?.sender.uid) {
      merge = true;
    }

    return (
      <MessageCard
        message={message}
        merge={merge}
        key={index}
      />
    );
    
  });

  return (
    <div className="ChatWindow-Wrapper">
      <ChatWindowHeader />
      <div className="ChatWindow-Content"></div>
      <form className="TypeBar" onSubmit={submitMessage}>
        {messages}
        <input type="text" onChange={messageChange} value={message} />
        <button>Send</button>
      </form>
    </div>
  );
}
