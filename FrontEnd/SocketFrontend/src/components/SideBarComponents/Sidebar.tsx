import "./Sidebar.css";

import { signOut, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";

import { auth } from "../../firebase";

import ChatCard from "./ChatCard";
import PopupFriends from "../Popup/PopupFriends";

import { User, Chat } from "../../interfaces";

import AddChat from "../Popup/AddChat";

interface props{
  TestAddChat: ()=>void,
  setCurrentChat: (ID: string) => void,
  addFriend: (FriendEmail: string) => void,
  FriendRequests: User[],
  Friends: User[]
}

export default function Sidebar(props: props) {
  const [chats, setChats] = useState<Chat[]>([]);

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
      <button onClick={props.TestAddChat}>Test Add Chat</button>
      <button className="Sidebar-Logout" onClick={logoutHandler}>
        Logout
      </button>
      <PopupFriends
        addFriend={props.addFriend}
        FriendRequests={props.FriendRequests}
      />
      <AddChat Friends={props.Friends}/>
    </div>
  );
}
