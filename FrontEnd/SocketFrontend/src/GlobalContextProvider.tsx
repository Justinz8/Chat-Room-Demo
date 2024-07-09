import { createContext } from "react";
import { useState, useMemo, useEffect } from "react";
import { useSocket } from "./CustomHooks";

import { useFetch } from "./CustomHooks";

import { auth } from "./firebase";

import { onAuthStateChanged } from "firebase/auth";

import { User } from "./interfaces";


const ChatIDContext = createContext<any[]>([]);
const FriendsContext = createContext<any[]>([]);
const FriendReqContext = createContext<any[]>([]);

interface props{
    children: React.ReactElement[] | React.ReactElement
}

export function GlobalContextWrapper(props:props){
    const Fetch = useFetch('http://localhost:3000');

    const [currentChatID, SetCurrentChatID] = useState<string>("");
    const [Friends, SetFriends] = useState<User[]>([]);
    const [FriendRequests, SetFriendRequests] = useState<User[]>([]);

    const ChatIdContextValue = useMemo(()=>([
        currentChatID,
        SetCurrentChatID
    ]), [currentChatID])

    const FriendsValue = useMemo(()=>([
        Friends, 
        SetFriends
    ]), [Friends])

    const FriendRequestsValue = useMemo(()=>([
        FriendRequests,
        SetFriendRequests
    ]), [FriendRequests])

    const socket = useSocket();

    useEffect(()=>{
        if(socket){
          socket.on("connected", ()=>{
            if (currentChatID) {
              console.log("rejoined", currentChatID)
              socket.emit("joinRoom", currentChatID);
            }
          })
        }
      }, [socket, currentChatID])

    useEffect(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
            Fetch('getUserData').then((data) => {
                console.log(data)
                SetFriendRequests(data.requests);
                SetFriends(data.friends);
            });
            }
        });
    }, []);

    useEffect(()=>{
        if(socket){
            socket.on("FriendRequest", (User: User) => {
                SetFriendRequests((x: User[]) => [...x, User])
            });
        } 
    }, [socket])

    return (
        <ChatIDContext.Provider value={ChatIdContextValue}>
            <FriendsContext.Provider value={FriendsValue}>
                <FriendReqContext.Provider value={FriendRequestsValue}>
                    {props.children}
                </FriendReqContext.Provider>
            </FriendsContext.Provider>
        </ChatIDContext.Provider>
    )
}

export function getFriendsContext(){
    return FriendsContext;
}

export function getChatIDContext(){
    return ChatIDContext;
}

export function getFriendReqContext(){
    return FriendReqContext;
}