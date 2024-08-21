import { useState, useContext } from "react"
import { useSocket, useLoadedUserGetter } from "../../CustomHooks"
import './AddChat.css'

import { getFriendsContext } from "../../GlobalContextProvider"
import Popup from "reactjs-popup"

interface AddChatForm{
    Name: string,
    Friends: string[]
}


export default function AddChat(){

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
    const AddedFriends = AddChatForm.Friends.map((x: string) => {

        const user = getLoadedUser(x);

        const Username = typeof(user) === "string" ? x : user.User.Username

        return (
            <li key={x}>
                <p>{Username}</p>
                <button onClick={()=>{RemoveFriend(x)}}>Remove</button>
            </li>
        )
    })

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
                <h3>Create a new Chat</h3>
                <form onSubmit={handleAddChatFormSubmit} className="AddChat-Form">
                    <label htmlFor="AddChat-ChatName">Chat Name</label>
                    <br />
                    <input type="text" id="AddChat-ChatName" onChange={AddChatNameFormHandler} value={AddChatForm.Name}></input>
                    <h3>Select friends to add to chat: </h3>
                    <select id="AddChat-AddFriend" value={""} onChange={()=>{}}>
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
                {AddChatPopUpBody()}
            </Popup>
        </div>
    )
}