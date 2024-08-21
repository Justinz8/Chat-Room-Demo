import { createContext } from "react";
import { useState, useMemo, useEffect } from "react";
import { useSocket } from "./CustomHooks";

import { useFetch, useLoadedUserGetter } from "./CustomHooks";

import { auth } from "./firebase";

import { onAuthStateChanged } from "firebase/auth";

import { User, Chat, KnownUser } from "./interfaces";

interface ChatContextType{
    currentChat: Chat,
    SetCurrentChat: React.Dispatch<React.SetStateAction<Chat>>
}

interface FriendsContextType{
    Friends: Set<string>,
    SetFriends: React.Dispatch<React.SetStateAction<Set<string>>>
}

interface FriendReqContextType{
    FriendRequests: User[],
    SetFriendRequests: React.Dispatch<React.SetStateAction<User[]>>
}

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
        owner: "",
        members: []
    });
    const [Friends, SetFriends] = useState<Set<string>>(new Set());
    const [FriendRequests, SetFriendRequests] = useState<User[]>([]);

    const {UpdateLoadedUser, updateUserState } = useLoadedUserGetter()

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
        SetFriendRequests,
    }), [FriendRequests])

    const socket = useSocket();
    /*
        if disconnected from socket whilst in a chat room then when 
        reconnecting to the socket also rejoin the room associated with the chat room
    */
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

      useEffect(()=>{
        onAuthStateChanged(auth, (user) =>{
            if(!user){
                SetFriends(new Set())
                SetFriendRequests([])
                SetCurrentChat({
                    name: "",
                    id: "",
                    owner: "",
                    members: []
                })
            }
        } )
      }, [])


      /*
        Get all data related to the user that is needed on the initial load
      */
    useEffect(() => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                Fetch('getUserData').then((data) => {
                    SetFriendRequests(data.requests);

                    const friendsString = new Set<string>()
                    if(auth.currentUser){   //add current user to the list of loaded users
                        UpdateLoadedUser(auth.currentUser.uid, {
                            Status: 1,
                            User: {
                                uid: auth.currentUser.uid,
                                Username: data.Username
                            }
                        })
                    }
                    
                    data.friends.forEach(x => {//add each friend as a loaded user
                        UpdateLoadedUser(x.User.uid, x)
                        friendsString.add(x.User.uid)
                    })
                    SetFriends(friendsString);
                });
            }
        });
    }, [Fetch, UpdateLoadedUser]);

    useEffect(()=>{
        if(socket){
            /*
                On the instance of a new friend request add User to the list of friend requests
            */
            socket.on("FriendRequest", (User: User) => {
                SetFriendRequests((x: User[]) => [...x, User])
            });

            /*
                On the instance where a friend is removed, remove the friend with uid from the
                list of friends
            */
            socket.on("RemoveFriend", (uid: string) => {
                SetFriends(x => {
                    if(!x.has(uid)) return x;

                    const newFriendsList = new Set(x);
                    newFriendsList.delete(uid);
                    
                    return newFriendsList;
                })
            })
        } 
    }, [socket])

    useEffect(()=>{
        if(socket){
            /*
                On the instance of a new friend (i.e. a friend request is accepted),
                add that user to the list of loaded users, remove User from friend requests,
                and update the list of friends to include User
            */
            socket.on("NewFriend", (User: KnownUser) => {
                
                UpdateLoadedUser(User.User.uid, User)
                SetFriendRequests(x => {
                    const temp: User[] = [];

                    x.forEach(user => {
                        if(user.uid !== User.User.uid) temp.push(user);
                    })

                    return temp;
                })
                SetFriends(x => {
                    const temp = new Set(x)
                    temp.add(User.User.uid)
                    return temp
                })
            })
        }
    }, [UpdateLoadedUser, socket])

    useEffect(()=>{
        if(socket){
            //sets User with uid to have online status
            socket.on("UserOnline", uid => {
                updateUserState(uid, 1)
            })

            //sets User with uid to have offline status
            socket.on("UserOffline", uid => {
                updateUserState(uid, 0)
            })
        }
    }, [socket, updateUserState])

    useEffect(()=>{
        if(socket){
            /*
             kicks the user from the current chat room if their permission to the chat room
             has been revoked
             */
            socket.on('RevokeChatPerm', chatID => {
                SetCurrentChat(x => {
                    
                    if(x.id === chatID){
                        return {
                            name: "",
                            id: "",
                            owner: "",
                            members: []
                        }
                    }else{
                        return x
                    }
                })
            })

            socket.on('RemoveUser', (uid) => {
                /*

                update state of Chat Members
                and remove from LoadedUsers if not affiliated to uid as a Friend
                (this is because we won't get updates on the online Status of uid anyways)

                */
                SetCurrentChat(x => { //remove kicked member from current chat member list
                    const newMembers: string[] = []

                    x.members.forEach(member => {
                        if(member !== uid) newMembers.push(member);
                    })

                    return {
                        ...x,
                        members: newMembers
                    }
                })

                // if(!Friends.has(uid)){ //if removed user is not in Friends list remove them from loaded users
                //     SetLoadedUsers(x => {
                //         const newLoadedUsers = new Map(x);
                //         newLoadedUsers.delete(uid)
                //         return newLoadedUsers
                //     })
                // }
            })
        }
    }, [socket, SetCurrentChat])

    useEffect(()=>{
        if(socket){

            //update chat with chatID's owner to uid
            socket.on('ChangeOwner', ({ uid, chatID}) => {
                SetCurrentChat(x => {
                    if(x.id === chatID){
                        return ({
                            ...x,
                            owner: uid
                        })
                    }  
                    return x
                })
            })

            //update chat with chatID's title to newTitle
            socket.on('ChangeChatTitle', ({chatID, newTitle}) => {
                SetCurrentChat(x => {
                    if(x.id === chatID){
                        return {
                            ...x,
                            name: newTitle
                        }
                    }
                    return x
                })
            })

            //update chat with Chatid's members list to also include NewUser
            socket.on('UpdateChatUsers', ({Chatid, NewUser})=>{
                UpdateLoadedUser(NewUser.User.uid, NewUser)
                SetCurrentChat(x => {
                    if(x.id === Chatid){
                        return {
                            ...x,
                            members: [...x.members, NewUser.User.uid]
                        }
                    }else{
                        return x
                    }
                })
            })
        }
    }, [socket, SetCurrentChat, UpdateLoadedUser])

    return (
        <ChatContext.Provider value={ChatContextValue}>
            <FriendsContext.Provider value={FriendsValue}>
                <FriendReqContext.Provider value={FriendRequestsValue}>
                    {props.children}
                </FriendReqContext.Provider>
            </FriendsContext.Provider>
        </ChatContext.Provider>
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