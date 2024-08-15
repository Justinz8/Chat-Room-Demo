import './UserActionPopup.css'

import { getFriendsContext, getChatContext } from "../../GlobalContextProvider";

import { auth } from "../../firebase"

import { useSocket } from '../../CustomHooks';

import { useContext } from "react";

interface props{
    uid: string,
    chatOptions: boolean, //show Chat options
}

export default function UserActionPopup(props: props){

    const {Friends} = useContext(getFriendsContext());

    const {currentChat} = useContext(getChatContext());

    const socket = useSocket();

    function addFriend(){
        if (socket) {
            socket.emit("AddFriend", { Frienduid: props.uid });
        }
    }

    function removeFriend(){
        if(socket){
            socket.emit("RemoveFriend", props.uid);
        }
    }

    function kickUser(){
        if(socket){
            socket.emit("RemoveFromChat", {uidInChat: props.uid, chatID: currentChat.id})
        }
    }

    function MakeOwner(){
        if(socket){
            socket.emit('MakeUserOwner', {uidInChat: props.uid, chatID: currentChat.id})
        }
    }

    function GroupOwnerOptions(){
        if(props.chatOptions && currentChat.owner === auth.currentUser?.uid){
            return (
                <>
                    <li>
                        <button onClick={kickUser}>
                            <p>
                                Kick User
                            </p>
                        </button>
                    </li>
                    <li>
                        <button onClick={MakeOwner}>
                            <p>
                                Make User Owner
                            </p>
                        </button>
                    </li>
                </>

            )
        }
    }

    function FriendOptions(){
        if(Friends.has(props.uid)){
            return (
                <li>
                    <button onClick={removeFriend}>
                        <p>
                            Remove Friend
                        </p>
                    </button>
                </li>
            )
        }else{
            return (
                <li>
                    <button onClick={addFriend}>
                        <p>
                            Add Friend
                        </p>
                    </button>
                </li>
            )
        }
    }



    return (
    <>
        {props.uid !== auth.currentUser?.uid && 
        <div className="UserActionPopup-Wrapper">
            <ul>
                {GroupOwnerOptions()}
                {FriendOptions()}
            </ul>
        </div>}
    </>
        
    )
}