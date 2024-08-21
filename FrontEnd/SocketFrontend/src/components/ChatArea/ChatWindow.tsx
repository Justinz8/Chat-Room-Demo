import "./ChatWindow.css";

import { useState, useEffect, useContext, useRef } from "react";

import MessageCard from "./MessageCard";

import { Message } from "../../interfaces";

import { useFetch, useSocket } from "../../CustomHooks";

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
        SetCurrentMessages((x) => [...x, message]);
      });
    }
    return () => {
      if (socket) socket.off(`RecieveMessage`);
    };
  }, [socket]);

  useEffect(() => {
    if (currentChat.id) {//on every chat switch, get the messages for that chat
      Fetch('getChatMessages', {
        chatID: currentChat.id,
      }).then((data) => {
        SetCurrentMessages(data.ChatMessages);
      });
    }else{
      SetCurrentMessages([])
    }
  }, [currentChat.id]);

  function messageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    SetMessage(e.target.value);
  }

  function submitMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    if(socket){
      socket.emit(`SendMessage`, { message: message, chatID: currentChat.id });
    }
    
    SetMessage("");
  }
  
  const messages = currentMessages.map((message: Message, index: number) => {
    let merge = false;

    //merge messages (not include name of sender and timestamp) if time between messages 
    //is less that 10 minutes, previous message is the same sender, type of message is 
    //1 (user sent message)
    if (message.type===1 && 
        currentMessages[index - 1]?.type === 1 && 
        message.sender.uid === currentMessages[index - 1]?.sender.uid && 
        message.timestamp - currentMessages[index - 1].timestamp < 600000) {
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

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(()=>{

    function handleEnterKeyPress(e: KeyboardEvent) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        const event = new Event('submit', { bubbles: true, cancelable: true });
        
        formRef.current?.dispatchEvent(event);
      }
    }

    inputRef.current?.addEventListener("keypress", handleEnterKeyPress)

    return ()=>{
      inputRef.current?.removeEventListener("keypress", handleEnterKeyPress)
    }

  }, [currentChat])

  return (
    <div className="ChatWindow-Wrapper">
      <ChatWindowHeader />
      <div className="ChatWindow-Content">
        {messages.reverse()}
      </div>
      {currentChat.id && (
        <form ref={formRef} className="TypeBar" onSubmit={submitMessage}>
          <textarea ref={inputRef} onChange={messageChange} value={message} />
          <button type="submit" hidden={true}/>
        </form>
      )}

    </div>
  );
}
