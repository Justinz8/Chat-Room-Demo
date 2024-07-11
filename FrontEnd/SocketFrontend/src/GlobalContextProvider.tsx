import { createContext } from "react";
import { useState, useMemo, useEffect } from "react";
import { useSocket } from "./CustomHooks";

import { useFetch } from "./CustomHooks";

import { auth } from "./firebase";

import { onAuthStateChanged } from "firebase/auth";

import { User, Chat, KnownUser } from "./interfaces";

interface ChatContextType{
    currentChat: Chat,
    SetCurrentChat: React.Dispatch<React.SetStateAction<Chat>>
}

interface FriendsContextType{
    Friends: string[],
    SetFriends: React.Dispatch<React.SetStateAction<string[]>>
}

interface FriendReqContextType{
    FriendRequests: User[],
    SetFriendRequests: React.Dispatch<React.SetStateAction<User[]>>
}

interface LoadedUserContextType{
    LoadedUsers: Map<string, KnownUser>,
    SetLoadedUsers: React.Dispatch<React.SetStateAction<Map<string, KnownUser>>>
}

const LoadedUserContext = createContext<LoadedUserContextType | null>(null);
const ChatContext = createContext<ChatContextType | null>(null);
const FriendsContext = createContext<FriendsContextType | null>(null);
const FriendReqContext = createContext<FriendReqContextType | null>(null);

interface props{
    children: React.ReactElement[] | React.ReactElement
}

export function GlobalContextWrapper(props:props){
    const Fetch = useFetch('http://localhost:3000');

    const [currentChat, SetCurrentChat] = useState<Chat>({
        name: "",
        id: "",
        members: []
    });
    const [Friends, SetFriends] = useState<string[]>([]);
    const [FriendRequests, SetFriendRequests] = useState<User[]>([]);

    const [LoadedUsers, SetLoadedUsers] = useState<Map<string, KnownUser>>(new Map<string, KnownUser>());

    const LoadedUserContextValue = useMemo(()=>({
        LoadedUsers,
        SetLoadedUsers
    }), [LoadedUsers])

    const ChatContextValue = useMemo(()=>({
        currentChat,
        SetCurrentChat
    }), [currentChat])
    

    const FriendsValue = useMemo(()=>({
        Friends, 
        SetFriends
    }), [Friends])

    const FriendRequestsValue = useMemo(()=>({
        FriendRequests,
        SetFriendRequests
    }), [FriendRequests])

    const socket = useSocket();

    useEffect(()=>{
        if(socket){
            socket.off("connected");
            socket.on("connected", ()=>{
                if (currentChat.id) {
                    
                    console.log("rejoined", currentChat.id)
                    socket.emit("joinRoom", currentChat.id);
                }
            })
        }
      }, [socket, currentChat.id])

    useEffect(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                Fetch('getUserData').then((data) => {
                    console.log(data)
                    SetFriendRequests(data.requests);

                    const friendsString:string[] = []

                    data.friends.forEach(x => {
                        if(!LoadedUsers.has(x.User.uid)){
                            SetLoadedUsers(OldLoadedUsers => {
                                const NewLoadedUsers = new Map(OldLoadedUsers);
                                NewLoadedUsers.set(x.User.uid, x);
                                return NewLoadedUsers;
                            })
                        }
                        friendsString.push(x.User.uid)
                    })

                    SetFriends(friendsString);
                });
            }
        });
    }, []);

    useEffect(()=>{
        if(socket){
            socket.on("FriendRequest", (User: User) => {
                SetFriendRequests((x: User[]) => [...x, User])
            });

            socket.on("NewFriend", (User: KnownUser) => {
                if(!LoadedUsers.has(User.User.uid)){
                    SetLoadedUsers(x => {
                        const newLoaded = new Map(x);
                        newLoaded.set(User.User.uid, User);
                        return newLoaded;
                    })
                }
                SetFriends(x => [...x, User.User.uid])
            })

            socket.on("UserOnline", uid => {
                
                SetLoadedUsers(x => {
                    if(x.has(uid)){
                        const newLoaded = new Map(x);
                        const OnlineUser = x.get(uid) as KnownUser;

                        newLoaded.set(uid, {
                            ...OnlineUser,
                            Status: 1
                        });
                        return newLoaded;
                    }else{
                        return x;
                    }
                })
            })

            socket.on("UserOffline", uid => {
                SetLoadedUsers(x => {
                    if(x.has(uid)){
                        const newLoaded = new Map(x);
                        const OnlineUser = x.get(uid) as KnownUser;

                        newLoaded.set(uid, {
                            ...OnlineUser,
                            Status: 0
                        });
                        return newLoaded;
                    }else{
                        return x;
                    }
                })
            })

        } 
    }, [socket])

    return (
        <LoadedUserContext.Provider value={LoadedUserContextValue}>
            <ChatContext.Provider value={ChatContextValue}>
                <FriendsContext.Provider value={FriendsValue}>
                    <FriendReqContext.Provider value={FriendRequestsValue}>
                        {props.children}
                    </FriendReqContext.Provider>
                </FriendsContext.Provider>
            </ChatContext.Provider>
        </LoadedUserContext.Provider>

    )
}

export function getFriendsContext(){
    return FriendsContext as React.Context<FriendsContextType>;
}

export function getChatContext(){
    return ChatContext as React.Context<ChatContextType>;
}

export function getFriendReqContext(){
    return FriendReqContext as React.Context<FriendReqContextType>;
}

export function getLoadedUserContext(){
    return LoadedUserContext as React.Context<LoadedUserContextType>;
}