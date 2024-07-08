import { User } from "../../interfaces"
import { useState, useEffect, useContext } from "react"
import { useSocket } from "../../CustomHooks"
import './AddChat.css'

import { Chat } from "../../interfaces"

import { getFriendsContext } from "../../GlobalContextProvider"

interface props{
    addChatsHelper: (chat: Chat)=>void
}

interface AddChatForm{
    Name: string,
    Friends: User[]
}


export default function AddChat(props: props){

    const [AddChatForm, SetAddChatForm] = useState<AddChatForm>({
        Name: "",
        Friends: []
    })

    const socket = useSocket();

    const [Friends, ] = useContext(getFriendsContext());

    function AddChatNameFormHandler(e: React.ChangeEvent<HTMLInputElement>){
        SetAddChatForm(x => {
            return {
                ...x,
                Name: e.target.value
            }
        })
    }

    function AddChatFormAddFriendHandler(Friend: User){
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

    const FriendOptions = Friends.map((x:User) => {
        return (
            <option onClick={()=>{AddChatFormAddFriendHandler(x)}} key={x.uid}>
                {x.Username}
            </option>
        )
    })

    function RemoveFriend(uid: string){
        SetAddChatForm(x => {
            const newFriends: User[] = []

            x.Friends.forEach(friend => {
                if(friend.uid !== uid){
                    newFriends.push(friend);
                }
            })


            return {
                ...x,
                Friends: newFriends
            }
        })
    }

    const AddedFriends = AddChatForm.Friends.map((x: User) => {
        return (
            <li key={x.uid}>
                <div>
                    <p>{x.Username}</p>
                    <button onClick={()=>{RemoveFriend(x.uid)}}>Remove</button>
                </div>
                
            </li>
        )
    })

    useEffect(()=>{
        if(socket){
            socket.on('newChat', (chat: Chat) => {
                console.log(chat)
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
                    members: AddChatForm.Friends.map(x => x.uid),
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
                <select id="AddChat-AddFriend" value={""}>
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