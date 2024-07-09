import "./Sidebar.css";

import { signOut, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";

import { auth } from "../../firebase";

import ChatCard from "./ChatCard";
import PopupFriends from "../Popup/PopupFriends";

import { Chat } from "../../interfaces";

import { useSocket, useFetch } from "../../CustomHooks";

import AddChat from "../Popup/AddChat";

export default function Sidebar() {
  const [chats, setChats] = useState<Chat[]>([]);

  const Fetch = useFetch('http://localhost:3000');

  const socket = useSocket();

  useEffect(()=>{
    if(socket){
      socket.on('UpdateChatUsers', ({Chatid, NewUser})=>{
        setChats(x => {
          return x.map(chat => {
            if(chat.id === Chatid){
              return {
                ...chat,
                members: [...chat.members, NewUser]
              }
            }
            return chat;
          })
        })
      })
    }
  }, [socket])

  function addChatsHelper(chat: Chat){
    setChats(x=>[...x, chat]);
  }

  useEffect(() => {
    onAuthStateChanged(auth, () => {
      Fetch('getChats').then((data) => {
          setChats(data.chats);
      });
    });
  }, []);

  const Styledchats = chats.map((x: Chat) => (
    <ChatCard
      key={x.id}
      chatDetails = {x}
    />
  ));

  function logoutHandler() {
    signOut(auth).catch((error) => {
      console.log(error);
    });
  }

  return (
    <div className="Sidebar-Wrapper">
      {Styledchats}
      <button className="Sidebar-Logout" onClick={logoutHandler}>
        Logout
      </button>
      <PopupFriends />
      <AddChat addChatsHelper={addChatsHelper}/>
    </div>
  );
}
