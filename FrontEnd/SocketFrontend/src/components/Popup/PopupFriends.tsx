import "./Friends.css";

import { User } from "../../interfaces";

import React, { useState, useContext } from "react";

import { useSocket, useLoadedUserGetter } from "../../CustomHooks";

import { getFriendReqContext, getFriendsContext } from "../../GlobalContextProvider";

export default function PopupFriends() {
  const [FriendsPopup, SetFriendsPopup] = useState(false);

  const [FriendEmail, SetFriendEmail] = useState("");

  const {FriendRequests, } = useContext(getFriendReqContext());
  const {Friends, } = useContext(getFriendsContext());
  const {getLoadedUser} = useLoadedUserGetter();

  const socket = useSocket();

  function addFriend(FriendEmail: string) {
    if (socket) {
      socket.emit("AddFriend", { FriendEmail: FriendEmail });
    }
  }

  function onFriendSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    addFriend(FriendEmail);
  }

  function AcceptFriendReq(CurrentFriendReq: string){
    if(socket){
      socket.emit("AcceptFriendReq", CurrentFriendReq);
    }
  }

  const [PopupRender, SetPopupRender] = useState<string>("");

  function FriendReqs(){
    const styledRequests = FriendRequests.map((x: User) => (
      <div>
        <h3>{x.Username}</h3>
        <button onClick={()=>{AcceptFriendReq(x.uid);}}>Accept</button>
        <button onClick={()=>{AcceptFriendReq(x.uid);}}>Decline</button>
      </div>
    ));

    return (
      <>
        
            <form onSubmit={onFriendSubmit}>
              <input
                type="text"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  SetFriendEmail(e.target.value)
                }
                value={FriendEmail}
              />
              <button>Add Friend</button>
            </form>
            {styledRequests}
      </>
    )
  }

  function FriendsList(){
    const styledFriends = Friends.map(x => {
      const user = getLoadedUser(x)

      const Username = typeof(user) === "string" ? x : user.User.Username

      const Status = typeof(user) === "string" ? -1 : user.Status

      return (
        <li>
          {Username}
          {Status}
        </li>
      )
    })

    return (
      <>
        <ul>
          {styledFriends}
        </ul>
      </>
    )
  }

  function renderedPopup(){
    switch(PopupRender){
      case "FriendReqs":{
        return FriendReqs()
      }
      case "Friends":{
        return FriendsList()
      }
      default: {
        return null;
      }
    }
  }

  return (
    <div>
      <button onClick={() => SetFriendsPopup(!FriendsPopup)}>Friends</button>
        {FriendsPopup ? (
          <div className="FirendsPopUp">
            <header>
              <button onClick={()=>{SetPopupRender("FriendReqs")}}>Friend Reqs</button>
              <button onClick={()=>{SetPopupRender("Friends")}}>Friends</button>
            </header>
            {renderedPopup()}
          </div>
        ) : null}
    </div>
  );
}
