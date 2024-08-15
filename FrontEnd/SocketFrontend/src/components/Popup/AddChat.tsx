import { useState, useEffect, useContext } from "react"
import { useSocket, useLoadedUserGetter } from "../../CustomHooks"
import './AddChat.css'

import { Chat } from "../../interfaces"

import { getFriendsContext } from "../../GlobalContextProvider"

interface props{
    addChatsHelper: (chat: Chat)=>void
}

interface AddChatForm{
    Name: string,
    Friends: string[]
}


export default function AddChat(props: props){

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

    const FriendOptions: JSX.Element[] = []
    
    Friends.forEach((x:string) => {

        const user = getLoadedUser(x);

        const Username = typeof(user) === "string" ? x : user.User.Username

        FriendOptions.push(
            <option onClick={()=>{AddChatFormAddFriendHandler(x)}} key={x}>
                {Username}
            </option>
        )
    })

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

    const AddedFriends = AddChatForm.Friends.map((x: string) => {

        const user = getLoadedUser(x);

        const Username = typeof(user) === "string" ? x : user.User.Username

        return (
            <li key={x}>
                <div>
                    <p>{Username}</p>
                    <button onClick={()=>{RemoveFriend(x)}}>Remove</button>
                </div>
                
            </li>
        )
    })

    useEffect(()=>{
        if(socket){
            socket.on('newChat', (chat: Chat) => {
                props.addChatsHelper(chat);
            })
        }
    }, [socket])

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

    function AddChatPopUpBody(){
        return (
            <div className="AddChat-Body">
            <form onSubmit={handleAddChatFormSubmit}>
                <label htmlFor="AddChat-ChatName">Chat Name</label>
                <input type="text" id="AddChat-ChatName" onChange={AddChatNameFormHandler} value={AddChatForm.Name}></input>
                <br />
                <h3>Selected the following to add to chat: </h3>
                <ul>
                    {AddedFriends}
                </ul>
                <br />
                <label htmlFor="AddChat-AddFriend">Chat Name</label>
                <select id="AddChat-AddFriend" value={""} onChange={()=>{}}>
                    <option></option>
                    {FriendOptions}
                </select>
                <button type="submit">Submit</button>
            </form>
        </div>
        )
    }

    const [AddChatPopup, SetAddChatPopup] = useState<boolean>(false);

    return (
        <div>
            <button onClick={()=>{SetAddChatPopup(x => !x)}}>Make Chat</button>
            {AddChatPopup && AddChatPopUpBody()}
        </div>
    )
}