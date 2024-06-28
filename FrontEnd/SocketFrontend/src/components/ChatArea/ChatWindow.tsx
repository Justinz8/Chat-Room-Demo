import "./ChatWindow.css";

import { useState, useEffect } from "react";

import MessageCard from "./MessageCard";

export default function ChatWindow(props: any) {
  const socket = props.socket;
  const currentChatID = props.currentChatID;

  const [message, SetMessage] = useState("");

  const [currentMessages, SetCurrentMessages] = useState<any[]>([]);

  useEffect(() => {
    if (socket) {
      socket.on(`RecieveMessage`, (text: any) => {
        SetCurrentMessages((x) => [...x, text]);
      });
    }
    return () => {
      if (socket) socket.off(`RecieveMessage`);
    };
  }, [socket]);

  useEffect(() => {
    if (currentChatID) {
      props.getToken().then((token: any) => {
        fetch("http://localhost:3000/getChatMessages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token: token, chatID: currentChatID }),
        })
          .then((response) => response.json())
          .then((data) => {
            SetCurrentMessages(data.ChatMessages);
          });
      });
    }
  }, [currentChatID]);

  function messageChange(e: React.ChangeEvent<HTMLInputElement>) {
    SetMessage(e.target.value);
  }

  function submitMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    socket.emit(`SendMessage`, { message: message, chatID: currentChatID });
    SetMessage("");
  }

  const messages = currentMessages.map((message: any, index: number) => {
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
