import "./Sidebar.css";

import { signOut, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";

import { auth } from "../../firebase";

import ChatCard from "./ChatCard";
import PopupFriends from "../Popup/PopupFriends";

import { User, Chat } from "../../interfaces";

import { useSocket } from "../../CustomHooks";

import AddChat from "../Popup/AddChat";

interface props{
  setCurrentChat: (ID: string) => void,
  FriendRequests: User[],
}

export default function Sidebar(props: props) {
  const [chats, setChats] = useState<Chat[]>([]);

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

  console.log(chats)

  function addChatsHelper(chat: Chat){
    setChats(x=>[...x, chat]);
  }

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        user.getIdToken().then((token) => {
          fetch("http://localhost:3000/getChats", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token: token }),
          })
            .then((response) => response.json())
            .then((data) => {
              setChats(data.chats);
            });
        });
      }
    });
  }, []);

  const Styledchats = chats.map((x: Chat) => (
    <ChatCard
      key={x.id}
      chatDetails = {x}
      setCurrentChat={props.setCurrentChat}
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
      <PopupFriends
        FriendRequests={props.FriendRequests}
      />
      <AddChat addChatsHelper={addChatsHelper}/>
    </div>
  );
}
