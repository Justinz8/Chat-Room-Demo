import "./Friends.css";

import { User } from "../../interfaces";

import React, { useState, useContext } from "react";

import { useSocket } from "../../CustomHooks";

import { getFriendReqContext } from "../../GlobalContextProvider";

export default function PopupFriends() {
  const [FriendsPopup, SetFriendsPopup] = useState(false);

  const [FriendEmail, SetFriendEmail] = useState("");

  const [FriendRequests, ] = useContext(getFriendReqContext());

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

  const styledRequests = FriendRequests.map((x: User) => (
    <div>
      <h3>{x.Username}</h3>
      <button onClick={()=>{AcceptFriendReq(x.uid);}}>Accept</button>
      <button onClick={()=>{AcceptFriendReq(x.uid);}}>Decline</button>
    </div>
  ));

  return (
    <div>
      <button onClick={() => SetFriendsPopup(!FriendsPopup)}>Friends</button>
      {FriendsPopup ? (
        <div className="FirendsPopUp">
          <h1>Friends</h1>
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
        </div>
      ) : null}
    </div>
  );
}
