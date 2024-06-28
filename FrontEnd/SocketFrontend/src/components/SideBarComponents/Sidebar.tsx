import "./Sidebar.css";

import { signOut, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import ChatCard from "./ChatCard";
import PopupFriends from "../Popup/PopupFriends";

export default function Sidebar(props: any) {
  const [chats, setChats] = useState<any>([]);

  useEffect(() => {
    onAuthStateChanged(props.auth, (user) => {
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

  const Styledchats = chats.map((x: any) => (
    <ChatCard
      key={x.id}
      name={x.name}
      members={x.members}
      chatID={x.id}
      setCurrentChat={props.setCurrentChat}
    />
  ));

  function logoutHandler() {
    signOut(props.auth).catch((error) => {
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
    </div>
  );
}
