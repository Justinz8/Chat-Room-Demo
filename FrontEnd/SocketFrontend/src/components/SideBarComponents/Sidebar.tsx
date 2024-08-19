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

      socket.on('DecreaseMemberCount', ({ uid, chatID}) => {
          setChats(x => {
            return x.map(chat => {
              if(chat.id === chatID){
                return {
                  ...chat,
                  members: [...chat.members].filter(member => member !== uid)
                }
              }
              return chat
            })
          })
      })

      socket.on('RevokeChatPerm', (chatID: string)=>{
        setChats(x => {
          return x.filter(chat => {
            return chat.id != chatID
          })
        })
      })

      socket.on('ChangeOwner', ({ uid, chatID}) => {
        setChats(x => {
          return x.map(chat => {
            if(chat.id === chatID){
              return {
                ...chat,
                owner: uid
              }
            }
            return chat
          })
        })
      })

      socket.on('ChangeChatTitle', ({chatID, newTitle}) => {
        setChats(x => {
          return x.map(chat => {
            if(chat.id === chatID){
              return {
                ...chat,
                name: newTitle
              }
            }
            return chat
          })
        })
    })
    }
  }, [UpdateLoadedUser, socket])
  
  useEffect(()=>{
    if(socket){
        socket.on('newChat', ({newchat, membersList}: {newchat: Chat, membersList: KnownUser[]}) => {
            setChats(x=>[...x, newchat]);
            console.log(chats)
            membersList.forEach(member => {
              UpdateLoadedUser(member.User.uid, member)
            })
        })
    }
  }, [UpdateLoadedUser, socket])

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
  }, [Fetch, UpdateLoadedUser]);

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
      <h2>Chats</h2>

      <div className="SideBar-Chats">
      {Styledchats}
      </div>
      
      <div className="Sidebar-ButtonSec">
        <PopupFriends />
        <AddChat />
        <button className="Sidebar-Button Sidebar-Logout" onClick={logoutHandler}>
          Logout
        </button>
      </div>
    </div>
  );
}
