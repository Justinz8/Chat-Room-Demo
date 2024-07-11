import "./Sidebar.css";

import { signOut, onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";

import { auth } from "../../firebase";

import ChatCard from "./ChatCard";
import PopupFriends from "../Popup/PopupFriends";

import { Chat, KnownUser } from "../../interfaces";

import { useSocket, useFetch, useLoadedUserGetter } from "../../CustomHooks";

import AddChat from "../Popup/AddChat";

export default function Sidebar() {
  const [chats, setChats] = useState<Chat[]>([]);

  const Fetch = useFetch('http://localhost:3000');

  const socket = useSocket();

  const {UpdateLoadedUser} = useLoadedUserGetter();

  useEffect(()=>{
    if(socket){
      socket.on('UpdateChatUsers', ({Chatid, NewUser})=>{

        UpdateLoadedUser(NewUser.User.uid, NewUser);

        setChats(x => {
          return x.map(chat => {
            if(chat.id === Chatid){
              return {
                ...chat,
                members: [...chat.members, NewUser.User.uid]
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
      if(user){
        Fetch('getChats').then((data) => { 
          //will probably make it so that it only returns the uids of members
          //then load the member information once user actually clicks on chat
          const LoadedChats = data.chats;

          const stringchats = LoadedChats.map((x: {members: KnownUser[], name: string, id: string}) => {
            const members:string[] = []

            x.members.forEach((member: KnownUser) => {
              members.push(member.User.uid);
              UpdateLoadedUser(member.User.uid, member)
            })
            
            return {
              ...x,
              members: members
            }
          })

          setChats(stringchats);
        });
      }else{
        setChats([]);
      }
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
