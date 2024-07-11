import './UsersBar.css'

import { useContext } from 'react'

import { getChatContext } from '../GlobalContextProvider'

import { useLoadedUserGetter } from '../CustomHooks';

export default function UsersBar(){

    const {getLoadedUser} = useLoadedUserGetter();

    const {currentChat, } = useContext(getChatContext());

    console.log(currentChat)
    const styledMembers = currentChat.members.map(x => {

        const user = getLoadedUser(x);

        const Status = (typeof(user) === "string") ? -1 : user.Status;

        const Username = (typeof(user) === "string") ? x : user.User.Username
        
        return (
            <div>
                <p>{Username}</p>
                <p>{Status}</p>
            </div>
        )
    })

    return (
        <div className='UsersBar-Wrapper'>
            {styledMembers}
        </div>
    )
}