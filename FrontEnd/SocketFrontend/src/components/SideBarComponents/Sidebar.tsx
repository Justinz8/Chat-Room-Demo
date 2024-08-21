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
      /*
        update chat with Chatid's member list by adding NewUser's uid whilst also storing
        NewUser as a loaded user
      */
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

      /*
        Remove User with uid from chat with chatID
      */

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

      /*
        delete chat with chatID from the list of chats
      */
      socket.on('RevokeChatPerm', (chatID: string)=>{
        setChats(x => {
          return x.filter(chat => {
            return chat.id != chatID
          })
        })
      })

      /*
        change the owner of the chat with chatID to be uid
      */
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

      /*
        Change the chat with chatID's title to newTitle
      */
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
      /*
        Add newchat to the chat list and add each member to the loaded users map
      */
        socket.on('newChat', ({newchat, membersList}: {newchat: Chat, membersList: KnownUser[]}) => {
            setChats(x=>[...x, newchat]);
            membersList.forEach(member => {
              UpdateLoadedUser(member.User.uid, member)
            })
        })
    }
  }, [UpdateLoadedUser, socket])

  useEffect(() => {
    /*
      if a new user is logged in get and set all the chats the user is in
      whilst also adding the member of every chat into the loaded users map
    */
    onAuthStateChanged(auth, (user) => {
      if(user){
        Fetch('getChats').then((data) => { 
          const LoadedChats = data.chats;

          //store all the members into the loaded user map whilst only storing the uid of each
          //member into the chat member list
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
