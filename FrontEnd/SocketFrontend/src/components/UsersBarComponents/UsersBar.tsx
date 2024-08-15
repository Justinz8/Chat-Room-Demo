import './UsersBar.css'

import { useContext } from 'react'

import Popup from 'reactjs-popup';
import UserActionPopup from '../Popup/UserActionPopup';

import { getChatContext } from '../../GlobalContextProvider'

import { useLoadedUserGetter } from '../../CustomHooks';

export default function UsersBar(){

    const {getLoadedUser} = useLoadedUserGetter();

    const {currentChat, } = useContext(getChatContext());

    const styledMembers = currentChat.members.map(x => {

        const user = getLoadedUser(x);

        const Status = (typeof(user) === "string") ? -1 : user.Status;

        const Username = (typeof(user) === "string") ? x : user.User.Username
        const uid = (typeof(user) === "string") ? x : user.User.uid
        
        return (
            <div>
                <Popup 
                  trigger={
                    <span className="UsersBar-Username">
                      {Username}
                    </span>
                  }
                  position={['left top', 'left bottom']}
                  keepTooltipInside='body'>
                  <UserActionPopup uid={uid} chatOptions={true}/>
                </Popup>
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