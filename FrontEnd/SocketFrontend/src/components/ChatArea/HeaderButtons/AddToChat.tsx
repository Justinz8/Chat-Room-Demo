import './AddToChat.css'

import { User } from '../../../interfaces';

import { useState, useContext } from 'react'

import { useSocket } from '../../../CustomHooks';

import { getChatIDContext, getFriendsContext } from '../../../GlobalContextProvider';

export default function AddToChat(){

    const [ToggleAddToChat, SetToggleAddToChat] = useState<boolean>(false);
    const [AddToChat, SetAddToChat] = useState<string>("");
    const [currentChatID, ] = useContext(getChatIDContext());
    const [Friends, ] = useContext(getFriendsContext());

    const socket = useSocket();

    const AddToChatUserOptions = Friends.map((x:User) => {
        return (
            <option value={x.uid}>
                {x.Username}
            </option>
        )
    })

    function HandleAddUserSubmit(e: React.FormEvent<HTMLFormElement>){
        e.preventDefault()

        if(socket){
            socket.emit('AddUserToChat', {Frienduid: AddToChat, Chatid: currentChatID})
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