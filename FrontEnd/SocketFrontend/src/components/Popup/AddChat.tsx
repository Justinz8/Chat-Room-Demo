import { useState, useContext, useEffect } from "react"
import { useSocket, useLoadedUserGetter } from "../../CustomHooks"
import './AddChat.css'

import { getFriendsContext } from "../../GlobalContextProvider"
import Popup from "reactjs-popup"

interface AddChatForm{
    Name: string,
    Friends: string[]
}


export default function AddChat(){

    function AddChatPopUpBody(){
        const [AddChatForm, SetAddChatForm] = useState<AddChatForm>({
            Name: "",
            Friends: []
        })
    
        const socket = useSocket();
    
        const {Friends, } = useContext(getFriendsContext());
    
        const {getLoadedUser} = useLoadedUserGetter();
    
        function AddChatNameFormHandler(e: React.ChangeEvent<HTMLInputElement>){
            SetAddChatForm(x => {
                return {
                    ...x,
                    Name: e.target.value
                }
            })
        }
    
        //add friend as selected members for the new chat

    
        const [FriendOptions, SetFriendOptions] = useState<JSX.Element[]>([])

        function AddChatFormAddFriendHandler(Friend: string){
            SetAddChatForm(x => {
                if(x.Friends.includes(Friend)){
                    return x;
                }
                return {
                    ...x,
                    Friends: [...x.Friends, Friend]
                }
            })
        }
    
        useEffect(()=>{
            Promise.all(Array.from(Friends).map((x:string) => {
                return getLoadedUser(x).then(user => {
                    const Username = typeof(user) === "string" ? x : user.User.Username
        
                    return (
                        <option value={x} key={x}>
                            {Username}
                        </option>
                    )
                })
            })).then(val => {
                SetFriendOptions(val)
            })
        }, [])
    
        //remove friend with uid from selected users to add as members to the new chat
        function RemoveFriend(uid: string){
            SetAddChatForm(x => {
                const newFriends: string[] = []
    
                x.Friends.forEach(friend => {
                    if(friend !== uid){
                        newFriends.push(friend);
                    }
                })
    
                return {
                    ...x,
                    Friends: newFriends
                }
            })
        }
    
        //list of added users to be members for the new chat
    
        const [AddedFriends, SetAddedFriends] = useState<JSX.Element[]>([])
    
        useEffect(()=>{
            Promise.all(
                AddChatForm.Friends.map((x: string) => {
                    return getLoadedUser(x).then(user => {
                        const Username = typeof(user) === "string" ? x : user.User.Username
            
                        return (
                            <li key={x}>
                                <p>{Username}</p>
                                <button onClick={()=>{RemoveFriend(x)}}>Remove</button>
                            </li>
                        )
                    })
                })
            ).then(val => {
                SetAddedFriends(val)
            })
        }, [AddChatForm])
    
        function handleAddChatFormSubmit(e: React.FormEvent<HTMLFormElement>){
            e.preventDefault();
    
            if(socket){
                socket.emit('addChat', {
                    chat: {
                        name: AddChatForm.Name,
                        members: AddChatForm.Friends,
                    }
                })
                SetAddChatForm({
                    Name: "",
                    Friends: []
                })
            }
    
    
        }

        return (
            <div className="AddChat-Body">
                <h3>Create a new Chat</h3>
                <form onSubmit={handleAddChatFormSubmit} className="AddChat-Form">
                    <label htmlFor="AddChat-ChatName">Chat Name</label>
                    <br />
                    <input type="text" id="AddChat-ChatName" onChange={AddChatNameFormHandler} value={AddChatForm.Name}></input>
                    <h3>Select friends to add to chat: </h3>
                    <select id="AddChat-AddFriend" value={""} onChange={(e)=>{AddChatFormAddFriendHandler(e.target.value)}}>
                        <option></option>
                        {FriendOptions}
                    </select>
                    <ul>
                        {AddedFriends}
                    </ul>
                    <button type="submit">Submit</button>
                </form>
            </div>
        )
    }

    return (
        <div>
            <Popup trigger={
                <button className="Sidebar-Button">Make Chat</button>
            }>
                <AddChatPopUpBody />
            </Popup>
        </div>
    )
}