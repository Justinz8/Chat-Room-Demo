import './AddToChat.css'

import { useState, useContext } from 'react'

import { useSocket } from '../../../CustomHooks';

import { getChatContext, getFriendsContext } from '../../../GlobalContextProvider';

import { useLoadedUserGetter } from '../../../CustomHooks';

export default function AddToChat(){

    const {getLoadedUser} = useLoadedUserGetter();

    const [ToggleAddToChat, SetToggleAddToChat] = useState<boolean>(false);
    const [AddToChat, SetAddToChat] = useState<string>("");
    const {currentChat, } = useContext(getChatContext());
    const {Friends, } = useContext(getFriendsContext());

    const socket = useSocket();

    const AddToChatUserOptions: JSX.Element[] = [];

    Friends.forEach((x:string) => {
        const user = getLoadedUser(x) //need to make sure this stays true

        const Username = typeof(user) === "string" ? x : user.User.Username

        AddToChatUserOptions.push(
            <option value={x}>
                {Username}
            </option>
        )
    })

    function HandleAddUserSubmit(e: React.FormEvent<HTMLFormElement>){
        e.preventDefault()
        
        if(socket){
            socket.emit('AddUserToChat', {Frienduid: AddToChat, Chatid: currentChat.id})
        }
    }

    function AddToChatChangeHandler(e: React.ChangeEvent<HTMLSelectElement>) {
        SetAddToChat(e.target.value);
    }

    function ToggledAddToChat(){
        return (
            <div className='AddToChat-Toggle-Body'>
                <form onSubmit={HandleAddUserSubmit}>
                    <select value={AddToChat} onChange={AddToChatChangeHandler}>
                        <option></option>
                        {AddToChatUserOptions}
                    </select>
                    <button type='submit'>SUBMIT</button>
                </form>
            </div>
        )
    }
    
    return (
        <div className='AddToChat-Body'>
            <button className='AddToChat-Toggle' onClick={()=>{SetToggleAddToChat(x=>!x)}}>Add To Chat</button>
            {ToggleAddToChat && ToggledAddToChat()}
        </div>
    )
}