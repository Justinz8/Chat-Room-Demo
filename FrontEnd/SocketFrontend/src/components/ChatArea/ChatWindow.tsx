import "./ChatWindow.css";

import { useState, useEffect } from "react";

import { useSocket } from "../../CustomHooks";

import MessageCard from "./MessageCard";

import { Message } from "../../interfaces";

import { useFetch } from "../../CustomHooks";

import { useContext } from "react";
import { getChatContext } from "../../GlobalContextProvider";

import ChatWindowHeader from "./ChatWindowHeader";

export default function ChatWindow() {
  const socket = useSocket();

  const {currentChat, } = useContext(getChatContext());

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
    if (currentChat.id) {
      Fetch('getChatMessages', {
        chatID: currentChat.id,
      }).then((data) => {
        SetCurrentMessages(data.ChatMessages);
      });
    }
  }, [currentChat.id]);

  function messageChange(e: React.ChangeEvent<HTMLInputElement>) {
    SetMessage(e.target.value);
  }

  function submitMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log(socket)
    if(socket){
      socket.emit(`SendMessage`, { message: message, chatID: currentChat.id });
    }
    
    SetMessage("");
  }
  //TODO: make this use global map too
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
      <div className="ChatWindow-Content">
        {messages.reverse()}
      </div>
      <form className="TypeBar" onSubmit={submitMessage}>
        <input type="text" onChange={messageChange} value={message} />
        <button>Send</button>
      </form>
    </div>
  );
}
